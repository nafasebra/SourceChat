import type { UIMessage } from 'ai';
import type { Source } from '@/lib/knowledge/documents';
export type ChatMessage = UIMessage<unknown, { sources: Source[] }>;
