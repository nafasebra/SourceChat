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
      <article className="user-message" aria-label="User message">
        <span className="eyebrow">YOU</span>
        <p>{text}</p>
      </article>
    );
  return (
    <article className="assistant-message" aria-label="SourceChat response">
      <div className="message-byline">
        <span className="mini-logo">
          <Sparkles size={15} />
        </span>
        <strong>SourceChat</strong>
        <span className="eyebrow">LOCAL KNOWLEDGE</span>
      </div>
      <Markdown
        text={text}
        sources={sources}
        onCitation={(id) => onCitation(id, message.id)}
      />
      {text && (
        <div className="message-actions">
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
