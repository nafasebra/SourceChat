import { describe, expect, it } from 'vitest';
import { decodeHistory, encodeHistory } from '@/lib/chat-history';
import { documents } from '@/lib/knowledge/documents';

describe('browser conversation history', () => {
  it('caps saved conversations and retains the latest messages in each', () => {
    const restored = decodeHistory(
      encodeHistory({
        activeId: 'chat-0',
        conversations: Array.from({ length: 25 }, (_, index) => ({
          id: `chat-${index}`,
          title: `Chat ${index}`,
          incomplete: false,
          messages: Array.from({ length: 45 }, (_, message) => ({
            id: `message-${message}`,
            role: 'user' as const,
            parts: [{ type: 'text' as const, text: `Message ${message}` }],
          })),
        })),
      }),
    );
    expect(restored.conversations).toHaveLength(20);
    expect(restored.conversations[0].id).toBe('chat-0');
    expect(restored.conversations.at(-1)?.id).toBe('chat-19');
    expect(restored.conversations[0].messages).toHaveLength(40);
    expect(restored.conversations[0].messages[0].id).toBe('message-5');
    expect(restored.conversations[0].messages.at(-1)?.id).toBe('message-44');
  });
  it('does not write a history larger than the restore limit', () => {
    expect(() =>
      encodeHistory({
        activeId: 'large',
        conversations: Array.from({ length: 5 }, (_, index) => ({
          id: String(index),
          title: 'Large conversation',
          incomplete: false,
          messages: Array.from({ length: 40 }, (_, message) => ({
            id: String(message),
            role: 'user' as const,
            parts: [{ type: 'text' as const, text: 'x'.repeat(12000) }],
          })),
        })),
      }),
    ).toThrow('too large');
  });
  it('round trips messages and citations with canonical local source metadata', () => {
    const saved = encodeHistory({
      activeId: 'chat-1',
      conversations: [
        {
          id: 'chat-1',
          title: 'Streaming',
          incomplete: true,
          messages: [
            {
              id: 'u',
              role: 'user',
              parts: [{ type: 'text', text: 'Explain streaming' }],
            },
            {
              id: 'a',
              role: 'assistant',
              parts: [
                { type: 'text', text: 'Incremental text [[streaming]]' },
                { type: 'data-sources', data: [documents[0]] },
              ],
            },
          ],
        },
      ],
    });
    expect(saved).not.toContain(documents[0].reference);
    const restored = decodeHistory(saved);
    expect(restored.activeId).toBe('chat-1');
    expect(restored.conversations[0].incomplete).toBe(true);
    expect(restored.conversations[0].messages[1].parts).toContainEqual({
      type: 'data-sources',
      data: [documents[0]],
    });
  });
  it('rejects malformed and incompatible stored data', () => {
    for (const raw of [
      '{',
      '{}',
      JSON.stringify({ version: 2, activeId: '', conversations: [] }),
      'x'.repeat(2000001),
    ])
      expect(() => decodeHistory(raw)).toThrow();
  });
  it('does not restore forged source metadata or unknown IDs', () => {
    const restored = decodeHistory(
      JSON.stringify({
        version: 1,
        activeId: 'c',
        conversations: [
          {
            id: 'c',
            title: 'Test',
            incomplete: false,
            messages: [
              {
                id: 'a',
                role: 'assistant',
                text: '[[forged]]',
                sourceIds: ['forged'],
                url: 'https://forged.example',
              },
            ],
          },
        ],
      }),
    );
    expect(restored.conversations[0].messages[0].parts).toContainEqual({
      type: 'data-sources',
      data: [],
    });
    expect(JSON.stringify(restored)).not.toContain('forged.example');
  });
});
