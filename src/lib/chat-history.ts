import { z } from 'zod';
import type { ChatMessage } from '@/lib/ai/types';
import { documents } from '@/lib/knowledge/documents';

export const HISTORY_KEY = 'sourcechat-history-v1';
export type Conversation = {
  id: string;
  title: string;
  messages: ChatMessage[];
  incomplete: boolean;
};
export type ChatHistory = { activeId: string; conversations: Conversation[] };
const savedMessage = z.object({
  id: z.string().max(200),
  role: z.enum(['user', 'assistant']),
  text: z.string().max(120000),
  sourceIds: z.array(z.string().max(100)).max(5),
});
const savedHistory = z.object({
  version: z.literal(1),
  activeId: z.string().max(200),
  conversations: z
    .array(
      z.object({
        id: z.string().max(200),
        title: z.string().max(80),
        incomplete: z.boolean(),
        messages: z.array(savedMessage).max(40),
      }),
    )
    .max(20),
});

export function encodeHistory(history: ChatHistory): string {
  const encoded = JSON.stringify({
    version: 1,
    activeId: history.activeId,
    conversations: history.conversations.slice(0, 20).map((conversation) => ({
      ...conversation,
      messages: conversation.messages.slice(-40).map((message) => ({
        id: message.id,
        role: message.role,
        text: message.parts
          .filter((part) => part.type === 'text')
          .map((part) => part.text)
          .join(''),
        sourceIds:
          message.parts
            .find((part) => part.type === 'data-sources')
            ?.data.map((source) => source.id) ?? [],
      })),
    })),
  });
  if (encoded.length > 2000000) throw new Error('Saved history is too large.');
  return encoded;
}

export function decodeHistory(raw: string): ChatHistory {
  if (raw.length > 2000000) throw new Error('Saved history is too large.');
  const saved = savedHistory.parse(JSON.parse(raw));
  return {
    activeId: saved.activeId,
    conversations: saved.conversations.map((conversation) => ({
      ...conversation,
      messages: conversation.messages.map((message) => ({
        id: message.id,
        role: message.role,
        // Restore source metadata from the local library, never from browser storage.
        parts: [
          ...(message.role === 'assistant'
            ? [
                {
                  type: 'data-sources' as const,
                  data: documents.filter((source) =>
                    message.sourceIds.includes(source.id),
                  ),
                },
              ]
            : []),
          { type: 'text' as const, text: message.text },
        ],
      })),
    })),
  };
}
