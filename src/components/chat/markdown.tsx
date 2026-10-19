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
    <div className="text-sm leading-[1.85] wrap-anywhere [&_p]:my-[13px] [&_h3]:mt-[26px] [&_h3]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_h1]:my-5 [&_h1]:font-sans [&_h1]:text-xl [&_h2]:my-5 [&_h2]:font-sans [&_h2]:text-xl [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_pre]:overflow-x-auto [&_pre]:rounded-[10px] [&_pre]:bg-muted [&_pre]:p-[18px] [&_pre]:text-xs [&_:not(pre)>code]:rounded-[3px] [&_:not(pre)>code]:bg-muted [&_:not(pre)>code]:px-1 [&_:not(pre)>code]:py-0.5 [&_blockquote]:border-l-[3px] [&_blockquote]:border-accent [&_blockquote]:pl-4 [&_blockquote]:text-subtle [&_table]:block [&_table]:border-collapse [&_table]:overflow-x-auto [&_td]:border [&_td]:border-border [&_td]:p-2 [&_th]:border [&_th]:border-border [&_th]:p-2 [&_hr]:my-[23px] [&_hr]:border-border [&_em]:text-xs [&_em]:text-subtle [&_.hljs-keyword]:text-[#b874c1] [&_.hljs-selector-tag]:text-[#b874c1] [&_.hljs-literal]:text-[#b874c1] [&_.hljs-string]:text-accent [&_.hljs-attr]:text-accent [&_.hljs-number]:text-[#bd873e] [&_.hljs-title]:text-[#bd873e] [&_.hljs-comment]:text-subtle">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          a: ({ href, children }) => {
            const id = href?.startsWith('#source-') ? href.slice(8) : '';
            const source = sources.find((s) => s.id === id);
            return source ? (
              <button
                className="inline rounded-[5px] border border-border bg-muted px-[5px] py-px align-baseline text-[10px] font-semibold text-accent"
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
