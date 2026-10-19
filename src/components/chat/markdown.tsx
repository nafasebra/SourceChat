'use client';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import type { Source } from '@/lib/knowledge/documents';

export function Markdown({
  text,
  sources,
  onCitation,
}: {
  text: string;
  sources: Source[];
  onCitation: (id: string) => void;
}) {
  // The renderer never trusts a model-supplied URL. Only server-known citation IDs become controls.
  const prepared = text.replace(/\[\[([a-z0-9-]+)\]\]/g, (_, id: string) =>
    sources.some((s) => s.id === id)
      ? `[↗ ${sources.findIndex((s) => s.id === id) + 1}](#source-${id})`
      : '(unverified reference)',
  );
  return (
    <div className="markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          a: ({ href, children }) => {
            const id = href?.startsWith('#source-') ? href.slice(8) : '';
            const source = sources.find((s) => s.id === id);
            return source ? (
              <button
                className="citation"
                onClick={() => onCitation(id)}
                aria-label={`View source: ${source.title}`}
              >
                {children}
              </button>
            ) : (
              <span>{children}</span>
            );
          },
          img: ({ alt }) => <span>{alt}</span>,
        }}
      >
        {prepared}
      </ReactMarkdown>
    </div>
  );
}
