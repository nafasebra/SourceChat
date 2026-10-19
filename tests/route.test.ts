// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/chat/route';
import { publicError } from '@/lib/ai/errors';
import { getModel } from '@/lib/ai/provider';
import { getFreeModels } from '@/lib/ai/models';

vi.mock('@/lib/ai/models', () => ({
  getFreeModels: vi.fn(async () => [
    { id: 'minimax/minimax-m3.1-flash:free', name: 'MiniMax' },
    { id: 'example/alternate:free', name: 'Alternate free model' },
    { id: 'openrouter/free', name: 'Free models router' },
  ]),
}));
afterEach(() => vi.unstubAllEnvs());
const request = (text: string, model?: string) =>
  new Request('http://localhost/api/chat', {
    method: 'POST',
    body: JSON.stringify({
      model,
      messages: [{ id: 'u', role: 'user', parts: [{ type: 'text', text }] }],
    }),
  });
describe('chat route', () => {
  it('streams SDK SSE and known citations in mock mode without network calls', async () => {
    vi.stubEnv('MOCK_AI', 'true');
    const external = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('External call forbidden'));
    const response = await POST(request('Explain SSE streaming'));
    expect(response.headers.get('content-type')).toContain('text/event-stream');
    const body = await response.text();
    const text = body
      .split('\n')
      .filter((line) => line.startsWith('data: {'))
      .map(
        (line) => JSON.parse(line.slice(6)) as { type: string; delta?: string },
      )
      .filter((part) => part.type === 'text-delta')
      .map((part) => part.delta)
      .join('');
    expect(body).toContain('data-sources');
    expect(text).toContain('[[streaming]]');
    expect(body).toContain('"type":"finish"');
    expect(body).toContain('[DONE]');
    expect(external).not.toHaveBeenCalled();
  });
  it('rejects malformed and empty requests', async () => {
    expect(
      (
        await POST(
          new Request('http://localhost/api/chat', {
            method: 'POST',
            body: '{',
          }),
        )
      ).status,
    ).toBe(400);
    expect((await POST(request('  '))).status).toBe(400);
  });
  it('returns a useful real-mode configuration error without leaking a key', async () => {
    vi.stubEnv('MOCK_AI', 'false');
    vi.stubEnv('OPENROUTER_API_KEY', '');
    const res = await POST(request('streaming'));
    expect(res.status).toBe(503);
    expect(await res.text()).toContain('enable MOCK_AI');
  });
  it('rejects paid model configurations', () => {
    vi.stubEnv('OPENROUTER_API_KEY', 'test-secret');
    vi.stubEnv('OPENROUTER_MODEL', 'paid/model');
    expect(() => getModel()).toThrow('ending in :free');
  });
  it('sanitizes provider errors', () => {
    expect(publicError({ statusCode: 429 })).toContain('rate limited');
    expect(publicError(new Error('secret-key'))).not.toContain('secret-key');
  });
  it.each([undefined, 'example/alternate:free'])(
    'runs the real SDK/provider path with selected model %s',
    async (selectedModel) => {
      vi.stubEnv('MOCK_AI', 'false');
      vi.stubEnv('OPENROUTER_API_KEY', 'test-secret');
      vi.stubEnv('OPENROUTER_MODEL', '');
      const chunks = [
        {
          id: 'fixture',
          object: 'chat.completion.chunk',
          created: 1,
          model: 'fixture:free',
          choices: [
            {
              index: 0,
              delta: { role: 'assistant', content: 'Streaming works [[' },
              finish_reason: null,
            },
          ],
        },
        {
          id: 'fixture',
          object: 'chat.completion.chunk',
          created: 1,
          model: 'fixture:free',
          choices: [
            {
              index: 0,
              delta: { content: 'streaming]] [[forged]]' },
              finish_reason: null,
            },
          ],
        },
        {
          id: 'fixture',
          object: 'chat.completion.chunk',
          created: 1,
          model: 'fixture:free',
          choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
          usage: { prompt_tokens: 10, completion_tokens: 8, total_tokens: 18 },
        },
      ];
      const upstream = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(
          new Response(
            chunks.map((c) => `data: ${JSON.stringify(c)}\n\n`).join('') +
              'data: [DONE]\n\n',
            { headers: { 'Content-Type': 'text/event-stream' } },
          ),
        );
      const response = await POST(request('Explain streaming', selectedModel));
      const body = await response.text();
      expect(upstream).toHaveBeenCalledOnce();
      const [, init] = upstream.mock.calls[0];
      expect(JSON.parse(String(init?.body)).model).toBe(
        selectedModel ?? 'minimax/minimax-m3.1-flash:free',
      );
      expect(body).toContain('[[streaming]]');
      expect(body).toContain('(unverified reference)');
      expect(body).not.toContain('[[forged]]');
      expect(body).not.toContain('test-secret');
      expect(body).toContain('"type":"finish"');
    },
  );
  it('rejects a free-suffixed ID absent from the catalog before any generation', async () => {
    vi.stubEnv('MOCK_AI', 'false');
    vi.stubEnv('OPENROUTER_API_KEY', 'test-secret');
    vi.mocked(getFreeModels).mockResolvedValueOnce([]);
    const upstream = vi.spyOn(globalThis, 'fetch');
    const response = await POST(
      request('Explain streaming', 'missing/model:free'),
    );
    expect(response.status).toBe(400);
    expect(await response.text()).toContain('no longer listed');
    expect(upstream).not.toHaveBeenCalled();
  });
  it('propagates a mocked provider rate limit as a safe stream error', async () => {
    vi.stubEnv('MOCK_AI', 'false');
    vi.stubEnv('OPENROUTER_API_KEY', 'test-secret');
    vi.stubEnv('OPENROUTER_MODEL', 'openrouter/free');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          error: { message: 'secret upstream detail', code: 429 },
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    const body = await (await POST(request('Explain streaming'))).text();
    expect(body).toContain('rate limited');
    expect(body).not.toContain('secret upstream detail');
    expect(body).not.toContain('"type":"finish"');
  });
});
