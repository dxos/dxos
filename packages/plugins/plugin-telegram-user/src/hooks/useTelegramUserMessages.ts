//
// Copyright 2026 DXOS.org
//

import { useCallback, useEffect, useRef, useState } from 'react';

import { log } from '@dxos/log';

import { type TelegramUserChat } from '#types';

/** Normalized message pushed into the feed. */
export type TelegramUserMessage = {
  /** Client-side compound id: `${chatId}:${messageId}`. */
  readonly id: string;
  readonly chatId: string;
  readonly chatTitle: string;
  readonly chatType: 'user' | 'chat' | 'channel';
  readonly fromId?: string;
  readonly fromName?: string;
  readonly text: string;
  /** Unix seconds. */
  readonly date: number;
  /** True if this message was sent by the logged-in user (outgoing). */
  readonly outgoing: boolean;
};

const MAX_MESSAGES = 500;

/**
 * Subscribes to NewMessage events on a connected gramjs client and maintains
 * a rolling feed of recent messages across every chat the user is in.
 *
 * Prefetches recent dialogs on connect so the feed isn't empty before the
 * first new message arrives.
 */
export const useTelegramUserMessages = (client: any | null) => {
  const [messages, setMessages] = useState<TelegramUserMessage[]>([]);
  const [chats, setChats] = useState<TelegramUserChat[]>([]);
  const [error, setError] = useState<string | undefined>();
  const chatsByIdRef = useRef(new Map<string, TelegramUserChat>());
  const trackChat = useCallback((chat: TelegramUserChat) => {
    const existing = chatsByIdRef.current.get(chat.id);
    if (existing && existing.title === chat.title && existing.type === chat.type) {
      return;
    }
    chatsByIdRef.current.set(chat.id, chat);
    setChats(Array.from(chatsByIdRef.current.values()));
  }, []);

  // Prefetch recent dialogs so the feed shows history immediately.
  useEffect(() => {
    if (!client || !client.connected) {
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const dialogs = await client.getDialogs({ limit: 30 });
        if (cancelled) {
          return;
        }
        const seed: TelegramUserMessage[] = [];
        for (const dialog of dialogs) {
          const chatInfo = extractChatInfo(dialog.entity);
          if (chatInfo) {
            trackChat(chatInfo);
          }
          // normalizeMessage handles the text-vs-media decision itself; let it run
          // on anything we got back and just use its undefined return as the filter.
          if (dialog.message) {
            const normalized = normalizeMessage(dialog.message, chatInfo);
            if (normalized) {
              seed.push(normalized);
            }
          }
        }
        seed.sort((first, second) => first.date - second.date);
        setMessages(seed.slice(-MAX_MESSAGES));
      } catch (err) {
        log.warn('telegram-user: getDialogs failed', { error: String(err) });
        setError(String(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [client, trackChat]);

  // Subscribe to new messages.
  useEffect(() => {
    if (!client) {
      return;
    }
    let cancelled = false;
    let eventsMod: any;
    const handler = async (event: any) => {
      if (cancelled) {
        return;
      }
      try {
        const chatEntity = await event.getChat().catch(() => undefined);
        const chatInfo = extractChatInfo(chatEntity);
        if (chatInfo) {
          trackChat(chatInfo);
        }
        const normalized = normalizeMessage(event.message, chatInfo);
        if (!normalized) {
          return;
        }
        setMessages((prev) => [...prev, normalized].slice(-MAX_MESSAGES));
      } catch (err) {
        log.warn('telegram-user: event handler failed', { error: String(err) });
      }
    };
    (async () => {
      try {
        eventsMod = await import('telegram/events');
        client.addEventHandler(handler, new eventsMod.NewMessage({}));
      } catch (err) {
        log.warn('telegram-user: subscribe failed', { error: String(err) });
        setError(String(err));
      }
    })();
    return () => {
      cancelled = true;
      if (eventsMod && client) {
        try {
          client.removeEventHandler(handler, new eventsMod.NewMessage({}));
        } catch {
          // Ignore removal errors on disconnect.
        }
      }
    };
  }, [client, trackChat]);

  return { messages, chats, error };
};

/** Produce a minimal chat descriptor from a gramjs entity (User / Chat / Channel). */
export const extractChatInfo = (entity: any): TelegramUserChat | undefined => {
  if (!entity) {
    return undefined;
  }
  const id = String(entity.id ?? '');
  if (!id) {
    return undefined;
  }
  if (entity.className === 'User') {
    const name = [entity.firstName, entity.lastName].filter(Boolean).join(' ');
    return {
      id,
      title: name || entity.username || `User ${id}`,
      type: 'user',
      unread: 0,
    };
  }
  if (entity.className === 'Chat') {
    return { id, title: entity.title ?? `Chat ${id}`, type: 'chat', unread: 0 };
  }
  if (entity.className === 'Channel') {
    return { id, title: entity.title ?? `Channel ${id}`, type: 'channel', unread: 0 };
  }
  return undefined;
};

/** Heuristic: does this gramjs Message have attached media we should surface as [media]? */
const hasMedia = (msg: any): boolean => {
  if (!msg) {
    return false;
  }
  if (msg.media) {
    return true;
  }
  if (msg.photo || msg.document || msg.video || msg.audio || msg.sticker || msg.voice) {
    return true;
  }
  return false;
};

/** Flatten a gramjs Message into the feed's shape. */
export const normalizeMessage = (msg: any, chat: TelegramUserChat | undefined): TelegramUserMessage | undefined => {
  const rawText = typeof msg?.message === 'string' ? msg.message : '';
  // If text is empty but media is attached, render a [media] placeholder
  // instead of dropping the message. Matches the behavior documented in
  // the plugin README and keeps the unified inbox complete.
  const text = rawText || (hasMedia(msg) ? '[media]' : '');
  if (!text) {
    return undefined;
  }
  // Fall back to msg.chatId, then to whichever field peerId happens to carry
  // (PeerUser→userId, PeerChat→chatId, PeerChannel→channelId). Missing any of
  // these meant group/channel messages were silently dropped from the feed
  // whenever the entity wasn't resolvable via access hash.
  const peerFallback =
    msg?.chatId ?? msg?.peerId?.userId ?? msg?.peerId?.chatId ?? msg?.peerId?.channelId;
  const chatId = chat?.id ?? (peerFallback != null ? String(peerFallback) : '');
  if (!chatId) {
    return undefined;
  }
  const fromId = msg.senderId ? String(msg.senderId) : undefined;
  return {
    id: `${chatId}:${msg.id}`,
    chatId,
    chatTitle: chat?.title ?? `Chat ${chatId}`,
    chatType: chat?.type ?? 'user',
    fromId,
    fromName: msg.sender?.firstName
      ? [msg.sender.firstName, msg.sender.lastName].filter(Boolean).join(' ')
      : undefined,
    text,
    date: Number(msg.date ?? Math.floor(Date.now() / 1000)),
    outgoing: Boolean(msg.out),
  };
};
