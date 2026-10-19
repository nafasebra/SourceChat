'use client';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BookOpen,
  ChevronRight,
  FileText,
  Layers3,
  Moon,
  Plus,
  Sparkles,
  Square,
  Sun,
  X,
} from 'lucide-react';
import type { ChatMessage } from '@/lib/ai/types';
import { documents, type Source } from '@/lib/knowledge/documents';
import { Button } from '@/components/ui/button';
import { Message } from './message';

const transport = new DefaultChatTransport<ChatMessage>({
  api: '/api/chat',
  prepareSendMessagesRequest: ({ messages }) => ({
    body: {
      messages: messages.map((m) => ({
        id: m.id,
        role: m.role,
        parts: m.parts.filter((p) => p.type === 'text'),
      })),
    },
  }),
  fetch: async (input, init) => {
    const response = await fetch(input, init);
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      throw new Error(data?.error ?? 'Could not connect. Please retry.');
    }
    return response;
  },
});
const suggestions = [
  {
    title: 'How does AI streaming work?',
    label: 'FOLLOW THE RESPONSE',
    icon: Layers3,
  },
  {
    title: 'What makes a citation trustworthy?',
    label: 'LOOK BEHIND THE ANSWER',
    icon: BookOpen,
  },
  {
    title: 'How is SourceChat built?',
    label: 'EXPLORE THE ARCHITECTURE',
    icon: Sparkles,
  },
];

function saveTheme(dark: boolean) {
  try {
    window.localStorage.setItem('sourcechat-theme', dark ? 'dark' : 'light');
  } catch {
    /* Theme still works when storage is unavailable. */
  }
}

export function Chat({ mock }: { mock: boolean }) {
  const [input, setInput] = useState('');
  const [dark, setDark] = useState(false);
  const [panel, setPanel] = useState(false);
  const [selected, setSelected] = useState('');
  const [sourceMessage, setSourceMessage] = useState('');
  const [away, setAway] = useState(false);
  const [notice, setNotice] = useState('');
  const scroller = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const follow = useRef(true);
  const {
    messages,
    sendMessage,
    status,
    error,
    stop,
    regenerate,
    setMessages,
    clearError,
  } = useChat<ChatMessage>({
    transport,
    onFinish: ({ isAbort, isDisconnect, isError, finishReason }) => {
      if (isAbort) setNotice('Generation stopped. This answer is incomplete.');
      else if (isDisconnect || isError || finishReason !== 'stop')
        setNotice(
          'The response is incomplete. Retry to generate a new answer.',
        );
      else setNotice('Response complete.');
    },
  });
  const busy = status === 'submitted' || status === 'streaming';
  useEffect(() => {
    let preference: string | null = null;
    try {
      preference = window.localStorage.getItem('sourcechat-theme');
    } catch {
      /* Use the system preference when storage is blocked. */
    }
    setDark(
      preference
        ? preference === 'dark'
        : matchMedia('(prefers-color-scheme: dark)').matches,
    );
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);
  useEffect(() => {
    if (messages.length > 0 && follow.current && scroller.current)
      scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [messages, status, notice]);
  useEffect(() => {
    if (selected && panel)
      document.getElementById(`source-${selected}`)?.focus();
  }, [selected, panel, sourceMessage]);
  const latestAssistant = [...messages]
    .reverse()
    .find((m) => m.role === 'assistant');
  const activeMessage =
    messages.find((m) => m.id === sourceMessage) ?? latestAssistant;
  const retrieved = activeMessage?.parts.find(
    (p) => p.type === 'data-sources',
  )?.data;
  const sources: Source[] = retrieved ?? documents;
  const activeText =
    activeMessage?.parts
      .filter((p) => p.type === 'text')
      .map((p) => p.text)
      .join('') ?? '';
  function submit(text = input) {
    if (!text.trim() || busy) return;
    setInput('');
    setNotice('');
    clearError();
    follow.current = true;
    setAway(false);
    setSourceMessage('');
    void sendMessage({ text: text.trim() });
    composer.current?.focus();
  }
  function retry() {
    clearError();
    setNotice('');
    follow.current = true;
    void regenerate();
  }
  function reset() {
    setMessages([]);
    clearError();
    setNotice('');
    setSelected('');
    setSourceMessage('');
    composer.current?.focus();
  }
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="/" aria-label="SourceChat home">
          <span className="brand-mark">
            <Layers3 size={23} />
          </span>
          SourceChat<span className="brand-dot">.</span>
        </a>
        <Button
          variant="outline"
          className="new-chat"
          onClick={reset}
          disabled={busy}
        >
          <Plus size={17} />
          New conversation<span className="key-hint">↵</span>
        </Button>
        <div className="sidebar-label">YOUR WORKSPACE</div>
        <button
          className="nav-item active"
          onClick={() => {
            setPanel(false);
            composer.current?.focus();
          }}
        >
          <Sparkles size={17} />
          Ask SourceChat
          <ChevronRight size={14} />
        </button>
        <button
          className="nav-item"
          onClick={() => {
            setSourceMessage('');
            setPanel(true);
          }}
        >
          <BookOpen size={17} />
          Knowledge base<span className="count">05</span>
        </button>
        <div className="sidebar-note">
          <span className="note-icon">
            <BookOpen size={19} />
          </span>
          <h3>A little more grounded.</h3>
          <p>
            Answers informed by a small library. Sources you can actually
            explore.
          </p>
          <span className="small-rule" />
        </div>
        <div className="sidebar-bottom">
          <div className="mode-indicator">
            <span className="status-dot" />
            {mock ? 'Local demo mode' : 'OpenRouter · free model'}
          </div>
          <p>
            {mock
              ? 'No API key. Just curiosity.'
              : 'Answers from your local library.'}
          </p>
          <div className="bottom-row">
            <span className="eyebrow">BUILT TO BE OPEN</span>
            <Button
              variant="ghost"
              size="icon"
              aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              onClick={() => {
                saveTheme(!dark);
                setDark(!dark);
              }}
            >
              {dark ? <Sun size={17} /> : <Moon size={17} />}
            </Button>
          </div>
        </div>
      </aside>
      <main className="workspace">
        <header className="topbar">
          <div className="desktop-breadcrumb">
            <span className="breadcrumb">Workspace</span>
            <ChevronRight size={13} />
            <strong>New conversation</strong>
          </div>
          <span className="mobile-brand brand">SourceChat.</span>
          <Button
            variant="ghost"
            onClick={() => setPanel(!panel)}
            aria-expanded={panel}
            aria-controls="sources-panel"
          >
            <BookOpen size={16} />
            <span>Sources</span>
            <span className="source-count">{sources.length}</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="mobile-control"
            onClick={reset}
            disabled={busy}
            aria-label="New conversation"
          >
            <Plus size={18} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="mobile-control"
            onClick={() => {
              saveTheme(!dark);
              setDark(!dark);
            }}
            aria-label="Toggle theme"
          >
            <Moon size={17} />
          </Button>
        </header>
        <div
          className="conversation-scroll"
          ref={scroller}
          onScroll={() => {
            const el = scroller.current!;
            follow.current =
              el.scrollHeight - el.scrollTop - el.clientHeight < 90;
            setAway(!follow.current);
          }}
        >
          {messages.length === 0 ? (
            <section className="welcome">
              <div className="welcome-tag">
                <span className="status-dot" />A SMALL LIBRARY. BIG
                POSSIBILITIES.
              </div>
              <div className="hero-symbol">
                <Layers3 size={37} strokeWidth={1.25} />
                <span className="sparkle-one">✦</span>
                <span className="sparkle-two">✧</span>
              </div>
              <h1>
                Good questions deserve
                <br />
                <span>grounded answers.</span>
              </h1>
              <p className="hero-description">
                Meet your curious, source-conscious AI companion.
                <br className="desktop-break" /> Ask a question. Follow the
                thinking. Explore the sources.
              </p>
              <div className="suggestions">
                {suggestions.map(({ title, label, icon: Icon }) => (
                  <button key={title} onClick={() => submit(title)}>
                    <Icon size={20} strokeWidth={1.5} />
                    <span className="eyebrow">{label}</span>
                    <strong>{title}</strong>
                    <ArrowRight size={17} className="suggestion-arrow" />
                  </button>
                ))}
              </div>
              <div className="library-caption">
                <span className="overlap-icons">
                  <FileText size={14} />
                  <FileText size={14} />
                </span>
                Grounded in 5 curated learning notes<span>·</span>No web search
              </div>
            </section>
          ) : (
            <div className="messages">
              {messages.map((message) => (
                <Message
                  key={message.id}
                  message={message}
                  onCitation={(id, messageId) => {
                    setSourceMessage(messageId);
                    setSelected(id);
                    setPanel(true);
                  }}
                />
              ))}
              {busy && (
                <div className="generation-status">
                  <span className="status-dot pulse" />
                  {status === 'submitted'
                    ? 'Finding relevant notes…'
                    : 'Writing from your sources…'}
                </div>
              )}
              {notice && !busy && (
                <div className="completion-notice">
                  {notice}
                  {notice.includes('incomplete') && !error && (
                    <Button variant="ghost" onClick={retry}>
                      Retry response
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
          {error && (
            <div className="error-state" role="alert" aria-label="Chat error">
              <strong>Something interrupted the conversation.</strong>
              <p>{error.message}</p>
              <Button variant="outline" onClick={retry}>
                Retry response
              </Button>
            </div>
          )}
        </div>
        <div className="composer-area">
          {away && (
            <Button
              className="jump-latest"
              variant="outline"
              onClick={() => {
                follow.current = true;
                scroller.current?.scrollTo({
                  top: scroller.current.scrollHeight,
                });
                setAway(false);
              }}
            >
              <ArrowDown size={15} />
              Jump to latest
            </Button>
          )}
          <form
            className="composer"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <label htmlFor="prompt" className="sr-only">
              Your message
            </label>
            <textarea
              id="prompt"
              ref={composer}
              value={input}
              maxLength={12000}
              rows={2}
              placeholder="What are you curious about?"
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (
                  e.key === 'Enter' &&
                  !e.shiftKey &&
                  !e.nativeEvent.isComposing
                ) {
                  e.preventDefault();
                  submit();
                }
              }}
            />
            <div className="composer-toolbar">
              <span>
                <span className="tiny-sparkle">✦</span>
                {mock ? 'Demo model' : 'OpenRouter free'}
                <span className="toolbar-divider" />
                Local knowledge
              </span>
              {busy ? (
                <Button
                  size="icon"
                  aria-label="Stop generation"
                  onClick={() => {
                    void stop();
                    setNotice('Generation stopped. This answer is incomplete.');
                  }}
                >
                  <Square size={15} fill="currentColor" />
                </Button>
              ) : (
                <Button
                  size="icon"
                  type="submit"
                  aria-label="Send message"
                  disabled={!input.trim()}
                >
                  <ArrowUp size={19} />
                </Button>
              )}
            </div>
          </form>
          <p className="composer-footer">
            AI can make mistakes. Citations identify sources, not verified
            claims.<span>Enter to send · Shift + Enter for a new line</span>
          </p>
        </div>
        <div className="sr-only" role="status" aria-live="polite">
          {busy ? 'Generating response.' : error ? 'Response failed.' : notice}
        </div>
      </main>
      {panel && (
        <aside
          className="sources-panel"
          id="sources-panel"
          aria-label="Sources"
        >
          <div className="panel-header">
            <div>
              <span className="eyebrow">THE PAPER TRAIL</span>
              <h2>{retrieved ? 'Retrieved sources' : 'Knowledge base'}</h2>
            </div>
            <Button
              size="icon"
              variant="ghost"
              aria-label="Close sources"
              onClick={() => {
                setPanel(false);
                composer.current?.focus();
              }}
            >
              <X size={18} />
            </Button>
          </div>
          <p className="panel-description">
            {retrieved
              ? 'Notes retrieved for this response. A reference is not independent verification of a claim.'
              : 'Original learning notes that give this demo its context. Reference links provide further reading.'}
          </p>
          <div className="source-list">
            {sources.length === 0 && (
              <p>No matching local sources were found.</p>
            )}
            {sources.map((source, i) => (
              <section
                key={source.id}
                className={`source-card ${selected === source.id ? 'selected' : ''}`}
              >
                <div className="source-card-top">
                  <FileText size={17} />
                  <span>{String(i + 1).padStart(2, '0')}</span>
                  <span>
                    {activeText.includes(`[[${source.id}]]`)
                      ? 'CITED'
                      : retrieved
                        ? 'RETRIEVED'
                        : 'LEARNING NOTE'}
                  </span>
                </div>
                <h3 id={`source-${source.id}`} tabIndex={-1}>
                  {source.title}
                </h3>
                <p>{source.content}</p>
                {source.reference.startsWith('https://') ? (
                  <a href={source.reference} target="_blank" rel="noreferrer">
                    Reference documentation ↗
                  </a>
                ) : (
                  <span className="local-reference">{source.reference}</span>
                )}
              </section>
            ))}
          </div>
        </aside>
      )}
    </div>
  );
}
