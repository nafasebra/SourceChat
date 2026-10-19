import type { Source } from '@/lib/knowledge/documents';
export function mockAnswer(sources: Source[]): string {
  if (!sources.length)
    return 'I couldn’t find relevant information in the local knowledge base. Try asking about streaming, citations, accessibility, the architecture, or testing. This demo does not search the web.';
  return `Here’s what the local knowledge base says.\n\n${sources.map((source, i) => `### ${i + 1}. ${source.title}\n\n${source.content} [[${source.id}]]`).join('\n\n')}\n\n---\n*This is a local demo response, assembled from retrieved notes. Switch off mock mode to generate an answer with OpenRouter.*`;
}
