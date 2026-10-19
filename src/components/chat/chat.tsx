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
import type { ChatMessage, ModelOption } from '@/lib/ai/types';
import { documents, type Source } from '@/lib/knowledge/documents';
import { Button } from '@/components/ui/button';
import { Message } from './message';
import { useChatHistory } from '@/hooks/use-chat-history';

const transport = new DefaultChatTransport<ChatMessage>({
  api: '/api/chat',
  prepareSendMessagesRequest: ({ messages, body }) => ({
    body: {
      ...body,
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

export function Chat({
  mock,
  models = [],
  defaultModel = '',
  modelError = '',
}: {
  mock: boolean;
  models?: ModelOption[];
  defaultModel?: string;
  modelError?: string;
}) {
  const [selectedModel, setSelectedModel] = useState(() =>
    models.some((model) => model.id === defaultModel)
      ? defaultModel
      : (models[0]?.id ?? ''),
  );
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
      if (isAbort || isDisconnect || isError || finishReason !== 'stop')
        history.markIncomplete();
      else history.clearIncomplete();
      if (isAbort) setNotice('Generation stopped. This answer is incomplete.');
      else if (isDisconnect || isError || finishReason !== 'stop')
        setNotice(
          'The response is incomplete. Retry to generate a new answer.',
        );
      else setNotice('Response complete.');
    },
  });
  const busy = status === 'submitted' || status === 'streaming';
  const history = useChatHistory(messages, setMessages, busy);
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
    if (panel && sourceMessage === 'library')
      document.getElementById('sources-heading')?.focus();
    else if (selected && panel)
      document.getElementById(`source-${selected}`)?.focus();
  }, [selected, panel, sourceMessage]);
  const latestAssistant = [...messages]
    .reverse()
    .find((m) => m.role === 'assistant');
  const activeMessage =
    sourceMessage === 'library'
      ? undefined
      : (messages.find((m) => m.id === sourceMessage) ?? latestAssistant);
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
    if (!text.trim() || busy || !history.ready || (!mock && !selectedModel))
      return;
    history.clearIncomplete();
    setInput('');
    setNotice('');
    clearError();
    follow.current = true;
    setAway(false);
    setSourceMessage('');
    if (mock) void sendMessage({ text: text.trim() });
    else
      void sendMessage(
        { text: text.trim() },
        { body: { model: selectedModel } },
      );
    composer.current?.focus();
  }
  function retry() {
    history.clearIncomplete();
    clearError();
    setNotice('');
    follow.current = true;
    if (mock) void regenerate();
    else void regenerate({ body: { model: selectedModel } });
  }
  function reset() {
    history.startNew();
    setInput('');
    clearError();
    setNotice('');
    setSelected('');
    setSourceMessage('');
    composer.current?.focus();
  }
  function openHistory(id: string) {
    if (busy) return;
    history.openConversation(id);
    clearError();
    setNotice('');
    setInput('');
    setSelected('');
    setSourceMessage('');
    follow.current = true;
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
          variant="default"
          className="new-chat"
          onClick={reset}
          disabled={busy}
        >
          <Plus size={21} />
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
        {history.conversations.length > 0 && (
          <nav className="history-list" aria-label="Conversation history">
            <div className="sidebar-label">RECENT CONVERSATIONS</div>
            {history.conversations.map((conversation) => (
              <button
                key={conversation.id}
                className={`history-item ${conversation.id === history.activeId ? 'current' : ''}`}
                aria-current={
                  conversation.id === history.activeId ? 'true' : undefined
                }
                title={conversation.title}
                disabled={busy}
                onClick={() => openHistory(conversation.id)}
              >
                {conversation.title}
              </button>
            ))}
          </nav>
        )}
        {!history.conversations.length && (
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
        )}
        <div className="sidebar-bottom">
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
            size="icon"
            aria-label="Open knowledge base"
            title="Knowledge base"
            onClick={() => {
              setSourceMessage('library');
              setSelected('');
              setPanel(true);
            }}
          >
            <BookOpen size={19} />
          </Button>
          <Button
            variant="ghost"
            onClick={() => setPanel(!panel)}
            className="sources-toggle"
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
        {history.conversations.length > 0 && (
          <select
            className="mobile-history"
            aria-label="Conversation history"
            disabled={busy}
            value={
              history.conversations.some(
                (conversation) => conversation.id === history.activeId,
              )
                ? history.activeId
                : ''
            }
            onChange={(event) =>
              event.target.value ? openHistory(event.target.value) : reset()
            }
          >
            <option value="">New conversation</option>
            {history.conversations.map((conversation) => (
              <option key={conversation.id} value={conversation.id}>
                {conversation.title}
              </option>
            ))}
          </select>
        )}
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
                  <button
                    key={title}
                    onClick={() => submit(title)}
                    disabled={busy || (!mock && !selectedModel)}
                  >
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
          {modelError && (
            <p className="model-error" role="alert">
              {modelError} <a href="/">Reload models</a>
            </p>
          )}
          {history.storageNotice && (
            <p className="storage-notice">{history.storageNotice}</p>
          )}
          {history.restoredIncomplete && !busy && !notice && (
            <p className="completion-notice">
              This saved answer is incomplete.{' '}
              <Button variant="ghost" onClick={retry}>
                Retry response
              </Button>
            </p>
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
                {mock ? (
                  <span>Test fixtures</span>
                ) : (
                  <>
                    <label htmlFor="model" className="sr-only">
                      AI model
                    </label>
                    <select
                      id="model"
                      className="model-select"
                      value={selectedModel}
                      disabled={busy || !models.length}
                      onChange={(event) => {
                        setSelectedModel(event.target.value);
                        clearError();
                      }}
                    >
                      {!models.length && (
                        <option value="">No available models</option>
                      )}
                      {models.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.name}
                        </option>
                      ))}
                    </select>
                  </>
                )}
                <span className="toolbar-divider knowledge-context" />
                <span className="knowledge-context">Local knowledge</span>
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
                  disabled={!input.trim() || (!mock && !selectedModel)}
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
              <h2 id="sources-heading" tabIndex={-1}>
                {retrieved ? 'Retrieved sources' : 'Knowledge base'}
              </h2>
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
