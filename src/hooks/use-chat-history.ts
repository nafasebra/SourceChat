'use client';
import { useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '@/lib/ai/types';
import {
  decodeHistory,
  encodeHistory,
  HISTORY_KEY,
  type Conversation,
} from '@/lib/chat-history';

export function useChatHistory(
  messages: ChatMessage[],
  setMessages: (messages: ChatMessage[]) => void,
  busy: boolean,
) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState('');
  const [ready, setReady] = useState(false);
  const [storageNotice, setStorageNotice] = useState('');
  const [restoredIncomplete, setRestoredIncomplete] = useState(false);
  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    let id = crypto.randomUUID();
    try {
      const raw = window.localStorage.getItem(HISTORY_KEY);
      if (raw) {
        const saved = decodeHistory(raw);
        id = saved.activeId || id;
        setConversations(saved.conversations);
        const active = saved.conversations.find(
          (conversation) => conversation.id === id,
        );
        if (active) {
          setMessages(active.messages);
          setRestoredIncomplete(active.incomplete);
        }
      }
    } catch {
      setStorageNotice('Saved history could not be restored on this device.');
    }
    setActiveId(id);
    setReady(true);
  }, [setMessages]);

  useEffect(() => {
    if (!ready || !messages.length) return;
    setConversations((current) => {
      const existing = current.find(
        (conversation) => conversation.id === activeId,
      );
      if (
        existing?.messages === messages &&
        existing.incomplete === (busy || restoredIncomplete)
      )
        return current;
      const title =
        messages
          .find((message) => message.role === 'user')
          ?.parts.filter((part) => part.type === 'text')
          .map((part) => part.text)
          .join('') || 'Conversation';
      const conversation = {
        id: activeId,
        title: title.slice(0, 70),
        messages,
        incomplete: busy || restoredIncomplete,
      };
      return [
        conversation,
        ...current.filter((item) => item.id !== activeId),
      ].slice(0, 20);
    });
  }, [messages, activeId, ready, busy, restoredIncomplete]);

  useEffect(() => {
    if (!ready) return;
    const save = () => {
      try {
        window.localStorage.setItem(
          HISTORY_KEY,
          encodeHistory({ activeId, conversations }),
        );
      } catch {
        setStorageNotice(
          'Conversation history could not be saved on this device.',
        );
      }
    };
    const timer = window.setTimeout(save, busy ? 250 : 0);
    window.addEventListener('pagehide', save);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('pagehide', save);
    };
  }, [conversations, activeId, ready, busy]);

  function startNew() {
    setActiveId(crypto.randomUUID());
    setMessages([]);
    setRestoredIncomplete(false);
  }
  function openConversation(id: string) {
    const conversation = conversations.find((item) => item.id === id);
    if (!conversation) return;
    setActiveId(id);
    setMessages(conversation.messages);
    setRestoredIncomplete(conversation.incomplete);
  }
  return {
    conversations,
    activeId,
    ready,
    storageNotice,
    restoredIncomplete,
    markIncomplete: () => setRestoredIncomplete(true),
    clearIncomplete: () => setRestoredIncomplete(false),
    startNew,
    openConversation,
  };
}
