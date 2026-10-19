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
import { cn } from '@/lib/utils';
import { useChatHistory } from '@/hooks/use-chat-history';
import { useTheme } from '@/hooks/use-theme';

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
  const { isDark: dark, toggleTheme } = useTheme();
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
    <div className="flex h-dvh min-h-[480px] overflow-hidden">
      <aside className="flex w-[253px] shrink-0 flex-col border-r border-border bg-sidebar px-5 pt-8 pb-[18px] max-wide:w-[225px] max-desktop:hidden">
        <a
          className="flex items-center gap-[9px] text-[23px] font-bold tracking-[-1px] text-foreground no-underline"
          href="/"
          aria-label="SourceChat home"
        >
          <span className="flex text-accent">
            <Layers3 size={23} />
          </span>
          SourceChat<span className="-ml-[9px] text-accent">.</span>
        </a>
        <Button
          variant="default"
          className="mt-[33px] mb-8 h-14 min-h-14 justify-start bg-accent px-4 text-[13px] text-background shadow-[0_2px_3px_#00000003]"
          onClick={reset}
          disabled={busy}
        >
          <Plus size={21} />
          New conversation
          <span className="ml-auto text-inherit opacity-65">↵</span>
        </Button>
        <div className="mx-3 mb-3.5 text-[9px] font-semibold tracking-[1.5px] text-subtle">
          YOUR WORKSPACE
        </div>
        <button
          className="mb-[5px] flex w-full items-center gap-3 rounded-lg border-0 bg-[#e6ede3] p-3 text-left text-xs font-semibold text-[#2d624c] dark:bg-[#2d4033] dark:text-[#b5dcc0] [&>svg:last-child]:ml-auto"
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
          <nav
            className="my-[22px] min-h-0 flex-1 overflow-y-auto [&>div]:mb-2.5"
            aria-label="Conversation history"
          >
            <div className="mx-3 mb-3.5 text-[9px] font-semibold tracking-[1.5px] text-subtle">
              RECENT CONVERSATIONS
            </div>
            {history.conversations.map((conversation) => (
              <button
                key={conversation.id}
                className={cn(
                  'block w-full truncate rounded-lg border-0 px-3 py-[11px] text-left text-xs hover:bg-muted hover:text-foreground disabled:opacity-50',
                  conversation.id === history.activeId
                    ? 'bg-muted text-foreground'
                    : 'bg-transparent text-subtle',
                )}
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
          <div className="mx-[9px] my-auto pt-[35px] pb-[50px] [&>h3]:mt-3.5 [&>h3]:mb-2 [&>h3]:text-[13px] [&>h3]:font-medium [&>p]:text-xs [&>p]:leading-[1.8] [&>p]:text-subtle">
            <span className="text-accent">
              <BookOpen size={19} />
            </span>
            <h3>A little more grounded.</h3>
            <p>
              Answers informed by a small library. Sources you can actually
              explore.
            </p>
            <span className="mt-[25px] block h-0.5 w-[26px] bg-[#b9cabc]" />
          </div>
        )}
        <div className="border-t border-border px-2.5 pt-[18px] [&>p]:my-2 [&>p]:text-[10px] [&>p]:text-subtle">
          <div className="mt-[22px] flex items-center justify-between [&>span]:text-[8px]">
            <span className="text-[9px] font-semibold tracking-[1.5px] text-subtle">
              BUILT TO BE OPEN
            </span>
            <Button
              variant="ghost"
              size="icon"
              aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              onClick={toggleTheme}
            >
              {dark ? <Sun size={17} /> : <Moon size={17} />}
            </Button>
          </div>
        </div>
      </aside>
      <main className="relative flex min-w-0 flex-1 flex-col">
        <header className="flex h-[75px] shrink-0 items-center justify-between border-b border-border px-[37px] [&_button]:text-[11px] [&_strong]:font-medium max-desktop:h-[58px] max-desktop:gap-0 max-desktop:pr-3 max-desktop:pl-[18px]">
          <div className="flex items-center gap-3.5 text-[11px] max-desktop:hidden">
            <span className="text-subtle">Workspace</span>
            <ChevronRight size={13} />
            <strong>New conversation</strong>
          </div>
          <span className="mr-auto hidden items-center gap-[9px] text-[19px] font-bold tracking-[-1px] text-foreground max-desktop:inline-flex">
            SourceChat.
          </span>
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
            className="max-desktop:hidden"
            aria-expanded={panel}
            aria-controls="sources-panel"
          >
            <BookOpen size={16} />
            <span>Sources</span>
            <span className="rounded bg-muted px-1.5 py-0.5 text-[9px]">
              {sources.length}
            </span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="hidden max-desktop:inline-flex max-desktop:h-11 max-desktop:w-10"
            onClick={reset}
            disabled={busy}
            aria-label="New conversation"
          >
            <Plus size={18} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="hidden max-desktop:inline-flex max-desktop:h-11 max-desktop:w-10"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            <Moon size={17} />
          </Button>
        </header>
        {history.conversations.length > 0 && (
          <select
            className="hidden max-desktop:mx-3 max-desktop:my-1.5 max-desktop:block max-desktop:w-[calc(100%_-_24px)] max-desktop:rounded-[7px] max-desktop:border max-desktop:border-border max-desktop:bg-sidebar max-desktop:p-[7px] max-desktop:text-xs max-desktop:text-foreground"
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
          className="flex-1 overflow-y-auto overscroll-contain"
          ref={scroller}
          onScroll={() => {
            const el = scroller.current!;
            follow.current =
              el.scrollHeight - el.scrollTop - el.clientHeight < 90;
            setAway(!follow.current);
          }}
        >
          {messages.length === 0 ? (
            <section className="mx-auto w-full max-w-[790px] px-[35px] pt-[clamp(40px,7vh,95px)] pb-7 text-center large:pt-[11vh] max-wide:px-[25px] short-desktop:pt-8 short-desktop:pb-5 max-desktop:px-[22px] max-desktop:pt-[25px] max-desktop:pb-5">
              <div className="flex items-center justify-center gap-2 text-[8px] tracking-[2px] text-subtle short-desktop:hidden max-desktop:text-[7px] max-desktop:tracking-[1px] short-mobile:hidden">
                <span className="inline-block size-1.5 shrink-0 rounded-full bg-accent" />
                A SMALL LIBRARY. BIG POSSIBILITIES.
              </div>
              <div className="relative mx-auto mt-[34px] mb-[22px] grid h-[65px] w-[70px] place-items-center text-accent short-desktop:hidden max-desktop:mt-5 max-desktop:mb-3.5 short-mobile:hidden">
                <Layers3 size={37} strokeWidth={1.25} />
                <span className="absolute -right-0.5 top-px text-[19px] text-[#adbd91]">
                  ✦
                </span>
                <span className="absolute bottom-[3px] left-px text-[15px] text-[#9aaa8a]">
                  ✧
                </span>
              </div>
              <h1 className="m-0 font-serif text-[clamp(32px,3.6vw,53px)] leading-[1.13] font-normal tracking-[-1.9px] [&>span]:text-accent max-desktop:text-[32px] max-desktop:tracking-[-1.5px]">
                Good questions deserve
                <br />
                <span>grounded answers.</span>
              </h1>
              <p className="mt-[22px] mb-[35px] text-[13px] leading-[1.9] text-subtle max-desktop:mt-[15px] max-desktop:mb-5 max-desktop:text-[11px]">
                Meet your curious, source-conscious AI companion.
                <br /> Ask a question. Follow the thinking. Explore the sources.
              </p>
              <div className="grid grid-cols-3 gap-3 text-left max-wide:gap-2 max-desktop:grid-cols-1 [&>button]:relative [&>button]:flex [&>button]:min-h-[153px] [&>button]:flex-col [&>button]:items-start [&>button]:rounded-xl [&>button]:border [&>button]:border-border [&>button]:bg-background [&>button]:px-[17px] [&>button]:pt-5 [&>button]:pb-[34px] [&>button]:text-left [&>button]:transition-colors [&>button]:duration-200 [&>button:hover]:border-[#9bad9e] [&>button:hover]:bg-sidebar [&>button>svg:first-child]:mb-[19px] [&>button>svg:first-child]:text-accent [&>button>span]:text-[7px] [&>button>span]:tracking-[1px] [&>button>strong]:mt-2 [&>button>strong]:max-w-[145px] [&>button>strong]:text-xs [&>button>strong]:leading-[1.6] [&>button>strong]:font-medium max-desktop:[&>button]:grid max-desktop:[&>button]:min-h-[58px] max-desktop:[&>button]:grid-cols-[25px_1fr_18px] max-desktop:[&>button]:items-center max-desktop:[&>button]:gap-x-2.5 max-desktop:[&>button]:p-[13px] max-desktop:[&>button>svg:first-child]:row-span-2 max-desktop:[&>button>svg:first-child]:m-0 max-desktop:[&>button>span]:text-[6px] max-desktop:[&>button>strong]:mt-[3px] max-desktop:[&>button>strong]:max-w-none max-desktop:[&>button>strong]:text-[11px]">
                {suggestions.map(({ title, label, icon: Icon }) => (
                  <button
                    key={title}
                    onClick={() => submit(title)}
                    disabled={busy || (!mock && !selectedModel)}
                  >
                    <Icon size={20} strokeWidth={1.5} />
                    <span className="text-[9px] font-semibold tracking-[1.5px] text-subtle">
                      {label}
                    </span>
                    <strong>{title}</strong>
                    <ArrowRight
                      size={17}
                      className="absolute right-3.5 bottom-[13px] text-subtle max-desktop:static max-desktop:col-start-3 max-desktop:row-start-1 max-desktop:row-end-3"
                    />
                  </button>
                ))}
              </div>
              <div className="mt-[25px] flex items-center justify-center gap-[9px] text-[9px] text-subtle max-desktop:mt-[18px] max-desktop:gap-1.5 max-desktop:text-[8px]">
                <span className="flex [&>svg+svg]:-ml-[5px] [&>svg+svg]:bg-background">
                  <FileText size={14} />
                  <FileText size={14} />
                </span>
                Grounded in 5 curated learning notes<span>·</span>No web search
              </div>
            </section>
          ) : (
            <div className="m-auto w-full max-w-[770px] px-[35px] pt-10 pb-[25px] max-desktop:px-[22px] max-desktop:py-[26px]">
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
                <div className="flex items-center gap-2 py-[7px] text-xs text-subtle">
                  <span className="inline-block size-1.5 shrink-0 animate-pulse rounded-full bg-accent" />
                  {status === 'submitted'
                    ? 'Finding relevant notes…'
                    : 'Writing from your sources…'}
                </div>
              )}
              {notice && !busy && (
                <div className="flex items-center gap-2 py-[7px] text-xs text-subtle">
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
            <div
              className="mx-auto mt-[15px] mb-[30px] max-w-[650px] rounded-[10px] border border-[#caa59a] bg-sidebar p-5 [&>p]:my-2.5 [&>p]:text-xs [&>p]:text-subtle max-desktop:mx-5"
              role="alert"
              aria-label="Chat error"
            >
              <strong>Something interrupted the conversation.</strong>
              <p>{error.message}</p>
              <Button variant="outline" onClick={retry}>
                Retry response
              </Button>
            </div>
          )}
        </div>
        <div className="relative mx-auto w-full max-w-[840px] px-[34px] pt-[18px] pb-[21px] max-wide:px-[25px] max-desktop:px-[15px] max-desktop:pt-3 max-desktop:pb-[15px]">
          {away && (
            <Button
              className="absolute -top-[35px] left-1/2 h-[30px] -translate-x-1/2 rounded-[30px] text-[11px] shadow-[0_2px_8px_#0001]"
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
            <p
              className="mb-2.5 text-xs leading-[1.6] text-subtle [&>a]:text-accent [&>a]:underline"
              role="alert"
            >
              {modelError} <a href="/">Reload models</a>
            </p>
          )}
          {history.storageNotice && (
            <p className="mb-2.5 text-[11px] text-subtle">
              {history.storageNotice}
            </p>
          )}
          {history.restoredIncomplete && !busy && !notice && (
            <p className="flex items-center gap-2 py-[7px] text-xs text-subtle">
              This saved answer is incomplete.{' '}
              <Button variant="ghost" onClick={retry}>
                Retry response
              </Button>
            </p>
          )}
          <form
            className="rounded-[15px] border border-[#d5dbd2] bg-background px-[17px] pt-[17px] pb-[11px] shadow-[0_4px_18px_#283c2510] focus-within:border-[#8ba994] max-desktop:p-[13px] [&>textarea]:max-h-[180px] [&>textarea]:min-h-[49px] [&>textarea]:w-full [&>textarea]:resize-none [&>textarea]:border-0 [&>textarea]:bg-transparent [&>textarea]:font-sans [&>textarea]:text-[13px] [&>textarea]:leading-[1.6] [&>textarea]:text-foreground [&>textarea]:outline-none [&>textarea::placeholder]:text-subtle"
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
            <div className="flex items-center justify-between [&>span]:flex [&>span]:items-center [&>span]:gap-2 [&>span]:text-[10px] [&>span]:text-subtle [&>button]:size-8 [&>button]:rounded-[9px] [&>button]:bg-[#2c5945] [&>button]:text-white [&>button:disabled]:opacity-45">
              <span>
                <span className="text-base text-accent">✦</span>
                {mock ? (
                  <span>Test fixtures</span>
                ) : (
                  <>
                    <label htmlFor="model" className="sr-only">
                      AI model
                    </label>
                    <select
                      id="model"
                      className="min-w-0 max-w-[min(310px,45vw)] text-ellipsis rounded-md border border-border bg-background px-2 py-[5px] text-[10px] text-foreground focus-visible:outline-offset-3"
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
                <span className="mx-[3px] h-2.5 w-px bg-border max-desktop:hidden" />
                <span className="max-desktop:hidden">Local knowledge</span>
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
          <p className="mx-1 mt-[13px] flex justify-between gap-3 text-[8px] leading-[1.6] text-subtle max-desktop:justify-center max-desktop:text-center max-desktop:[&>span]:hidden">
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
          className="flex w-[340px] shrink-0 flex-col overflow-y-auto border-l border-border bg-sidebar px-[23px] py-[26px] max-wide:absolute max-wide:inset-y-0 max-wide:right-0 max-wide:top-[75px] max-wide:z-20 max-wide:shadow-[-10px_0_40px_#0001] max-desktop:top-[58px] max-desktop:w-[min(360px,100%)]"
          id="sources-panel"
          aria-label="Sources"
        >
          <div className="flex items-center justify-between [&_h2]:mt-[9px] [&_h2]:font-serif [&_h2]:text-[25px]">
            <div>
              <span className="text-[9px] font-semibold tracking-[1.5px] text-subtle">
                THE PAPER TRAIL
              </span>
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
          <p className="my-[23px] text-[11px] leading-[1.8] text-subtle">
            {retrieved
              ? 'Notes retrieved for this response. A reference is not independent verification of a claim.'
              : 'Original learning notes that give this demo its context. Reference links provide further reading.'}
          </p>
          <div className="flex flex-col gap-3.5">
            {sources.length === 0 && (
              <p>No matching local sources were found.</p>
            )}
            {sources.map((source, i) => (
              <section
                key={source.id}
                className={cn(
                  'rounded-[10px] border bg-background p-[17px] [&>h3]:mt-3.5 [&>h3]:mb-[9px] [&>h3]:text-[13px] [&>h3]:leading-[1.5] [&>h3]:font-semibold [&>p]:text-[11px] [&>p]:leading-[1.85] [&>p]:text-subtle [&>a]:mt-3.5 [&>a]:inline-block [&>a]:text-[10px] [&>a]:text-accent [&>a]:underline [&>a]:underline-offset-[3px]',
                  selected === source.id
                    ? 'border-accent ring-1 ring-accent'
                    : 'border-border',
                )}
              >
                <div className="flex items-center gap-2 text-[10px] text-accent [&>span:last-child]:ml-auto [&>span:last-child]:text-[7px] [&>span:last-child]:tracking-[1px] [&>span:last-child]:text-subtle">
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
                  <span className="mt-3.5 block font-mono text-[9px] wrap-anywhere text-subtle">
                    {source.reference}
                  </span>
                )}
              </section>
            ))}
          </div>
        </aside>
      )}
    </div>
  );
}
