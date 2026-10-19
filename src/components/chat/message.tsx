'use client';
import { useState } from 'react';
import { Check, Copy, Sparkles } from 'lucide-react';
import type { ChatMessage } from '@/lib/ai/types';
import { Button } from '@/components/ui/button';
import { Markdown } from './markdown';

export function Message({
  message,
  onCitation,
}: {
  message: ChatMessage;
  onCitation: (id: string, messageId: string) => void;
}) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>(
    'idle',
  );
  const text = message.parts
    .filter((p) => p.type === 'text')
    .map((p) => p.text)
    .join('');
  const sources =
    message.parts.find((p) => p.type === 'data-sources')?.data ?? [];
  if (message.role === 'user')
    return (
      <article
        className="mt-0 mr-0 mb-[30px] ml-auto w-fit max-w-[85%] rounded-[15px_15px_3px_15px] border border-border bg-sidebar px-5 py-4 [&>p]:mt-1.5 [&>p]:text-sm [&>p]:leading-[1.7] [&>p]:wrap-anywhere [&>p]:whitespace-pre-wrap"
        aria-label="User message"
      >
        <span className="text-[9px] font-semibold tracking-[1.5px] text-subtle">
          YOU
        </span>
        <p>{text}</p>
      </article>
    );
  return (
    <article className="mb-[35px]" aria-label="SourceChat response">
      <div className="mb-5 flex items-center gap-2.5 text-xs [&>span:last-child]:ml-auto [&>span:last-child]:text-[8px] max-desktop:[&>span:last-child]:text-[7px]">
        <span className="grid size-7 place-items-center rounded-lg bg-muted text-accent">
          <Sparkles size={15} />
        </span>
        <strong>SourceChat</strong>
        <span className="text-[9px] font-semibold tracking-[1.5px] text-subtle">
          LOCAL KNOWLEDGE
        </span>
      </div>
      <Markdown
        text={text}
        sources={sources}
        onCitation={(id) => onCitation(id, message.id)}
      />
      {text && (
        <div className="mt-3 flex items-center gap-[3px] text-[10px] text-subtle [&>button]:size-[30px]">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Copy response"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(text);
                setCopyState('copied');
              } catch {
                setCopyState('failed');
              }
            }}
          >
            {copyState === 'copied' ? <Check size={15} /> : <Copy size={15} />}
          </Button>
          <span role="status">
            {copyState === 'copied'
              ? 'Copied'
              : copyState === 'failed'
                ? 'Could not copy. Select the text to copy it.'
                : `${sources.length} retrieved sources`}
          </span>
        </div>
      )}
    </article>
  );
}
