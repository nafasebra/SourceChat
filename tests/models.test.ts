// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getFreeModels, parseFreeModels } from '@/lib/ai/models';
import { isMockMode } from '@/lib/ai/provider';

const free = {
  id: 'example/model:free',
  name: 'Example free model',
  architecture: { input_modalities: ['text'], output_modalities: ['text'] },
  pricing: { prompt: '0', completion: '0', request: '0' },
};
afterEach(() => vi.unstubAllEnvs());
describe('available model catalog', () => {
  it('includes only valid free text models with zero text and request prices', () => {
    expect(
      parseFreeModels({
        data: [
          free,
          { ...free, id: 'paid/model' },
          { ...free, pricing: { ...free.pricing, completion: '0.001' } },
          { ...free, pricing: { ...free.pricing, request: '0.1' } },
          { ...free, pricing: { prompt: '', completion: '0' } },
          {
            ...free,
            architecture: {
              input_modalities: ['image'],
              output_modalities: ['text'],
            },
          },
          { id: 'invalid:free' },
        ],
      }),
    ).toEqual([{ id: free.id, name: free.name }]);
  });
  it('deduplicates and sorts the catalog', () => {
    expect(
      parseFreeModels({
        data: [
          free,
          free,
          { ...free, id: 'another/model:free', name: 'A model' },
        ],
      }).map((model) => model.name),
    ).toEqual(['A model', free.name]);
  });
  it('returns only public metadata and keeps authorization on the server', async () => {
    vi.stubEnv('OPENROUTER_API_KEY', 'test-secret');
    const upstream = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ data: [free] })));
    const result = await getFreeModels();
    expect(result).toEqual([{ id: free.id, name: free.name }]);
    expect(JSON.stringify(result)).not.toContain('test-secret');
    expect(upstream.mock.calls[0][1]?.headers).toEqual({
      Authorization: 'Bearer test-secret',
    });
  });
  it('surfaces failed catalogs rather than inventing available models', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('', { status: 503 }),
    );
    await expect(getFreeModels()).rejects.toThrow('model catalog');
  });
  it('defaults to real mode and requires explicit test-fixture opt-in', () => {
    vi.stubEnv('MOCK_AI', '');
    expect(isMockMode()).toBe(false);
    vi.stubEnv('MOCK_AI', 'true');
    expect(isMockMode()).toBe(true);
  });
});
