//
// Copyright 2026 DXOS.org
//

import { useCallback, useEffect, useRef, useState } from 'react';

import { log } from '@dxos/log';

import { type TelegramChat } from '#types';

/** Parsed message from Telegram getUpdates. */
export type TelegramMessage = {
  updateId: number;
  messageId: number;
  chatId: number;
  chatTitle: string;
  chatType: 'private' | 'group' | 'supergroup' | 'channel';
  fromId: number;
  fromName: string;
  fromUsername?: string;
  text: string;
  date: number;
};

type TgUpdate = {
  update_id: number;
  message?: {
    message_id: number;
    from?: { id: number; first_name: string; last_name?: string; username?: string; is_bot?: boolean };
    chat: { id: number; title?: string; first_name?: string; type: string };
    text?: string;
    date: number;
  };
};

const POLL_TIMEOUT_S = 5;
const MAX_MESSAGES = 100;

/** Polls Telegram for new messages using getUpdates with long-polling. */
export const useTelegramMessages = (
  botToken: string | undefined,
  monitoredChatIds: string[],
  pollIntervalMs = 2_000,
) => {
  const [messages, setMessages] = useState<TelegramMessage[]>([]);
  const [discoveredChats, setDiscoveredChats] = useState<TelegramChat[]>([]);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [botUserId, setBotUserId] = useState<number | undefined>();

  const offsetRef = useRef<number>(0);
  const tokenRef = useRef(botToken);
  const chatFilterRef = useRef(new Set(monitoredChatIds));
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const discoveredRef = useRef(new Map<number, TelegramChat>());
  const firstPollRef = useRef(true);

  useEffect(() => {
    tokenRef.current = botToken;
  }, [botToken]);

  useEffect(() => {
    chatFilterRef.current = new Set(monitoredChatIds);
  }, [monitoredChatIds]);

  const fetchUpdates = useCallback(async () => {
    const token = tokenRef.current;
    if (!token) {
      return;
    }

    try {
      const params = new URLSearchParams({
        offset: String(offsetRef.current),
        timeout: String(POLL_TIMEOUT_S),
        allowed_updates: JSON.stringify(['message']),
      });
      const response = await fetch(`https://api.telegram.org/bot${token}/getUpdates?${params}`, {
        method: 'GET',
      });
      const data = (await response.json()) as { ok: boolean; result?: TgUpdate[]; description?: string };
      if (!data.ok) {
        throw new Error(data.description ?? 'getUpdates failed');
      }

      const updates = data.result ?? [];
      if (updates.length === 0) {
        return;
      }

      // Advance offset past the highest update_id.
      const maxId = Math.max(...updates.map((update) => update.update_id));
      offsetRef.current = maxId + 1;

      // On first poll, just seed the offset — don't surface old messages.
      if (firstPollRef.current) {
        firstPollRef.current = false;
        // Discover chats from first batch so the settings panel can show them.
        for (const update of updates) {
          const msg = update.message;
          if (msg) {
            trackChat(msg.chat);
          }
        }
        // Resolve bot user id.
        try {
          const meResponse = await fetch(`https://api.telegram.org/bot${token}/getMe`, { method: 'POST' });
          const meData = (await meResponse.json()) as { ok: boolean; result?: { id: number } };
          if (meData.ok && meData.result) {
            setBotUserId(meData.result.id);
          }
        } catch {
          // Non-critical.
        }
        return;
      }

      const filter = chatFilterRef.current;
      const newMessages: TelegramMessage[] = [];

      for (const update of updates) {
        const msg = update.message;
        if (!msg || !msg.text) {
          continue;
        }

        trackChat(msg.chat);

        // If filter is non-empty, only include monitored chats.
        if (filter.size > 0 && !filter.has(String(msg.chat.id))) {
          continue;
        }

        const fromName = [msg.from?.first_name, msg.from?.last_name].filter(Boolean).join(' ') || 'Unknown';
        newMessages.push({
          updateId: update.update_id,
          messageId: msg.message_id,
          chatId: msg.chat.id,
          chatTitle: msg.chat.title ?? msg.chat.first_name ?? `Chat ${msg.chat.id}`,
          chatType: msg.chat.type as TelegramMessage['chatType'],
          fromId: msg.from?.id ?? 0,
          fromName,
          fromUsername: msg.from?.username,
          text: msg.text,
          date: msg.date,
        });
      }

      if (newMessages.length > 0) {
        setMessages((prev) => [...prev, ...newMessages].slice(-MAX_MESSAGES));
        setError(undefined);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      log.warn('telegram: poll failed', { error: message });
      setError(message);
    }
  }, []);

  const trackChat = (chat: { id: number; title?: string; first_name?: string; type: string }) => {
    if (!discoveredRef.current.has(chat.id)) {
      const entry: TelegramChat = {
        id: chat.id,
        title: chat.title ?? chat.first_name ?? `Chat ${chat.id}`,
        type: chat.type as TelegramChat['type'],
      };
      discoveredRef.current.set(chat.id, entry);
      setDiscoveredChats(Array.from(discoveredRef.current.values()));
    }
  };

  const startPolling = useCallback(() => {
    if (intervalRef.current) {
      return;
    }
    setPolling(true);
    setError(undefined);
    firstPollRef.current = true;
    void fetchUpdates();
    intervalRef.current = setInterval(() => void fetchUpdates(), pollIntervalMs);
  }, [fetchUpdates, pollIntervalMs]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = undefined;
    }
    setPolling(false);
  }, []);

  // Cleanup on unmount.
  useEffect(() => () => stopPolling(), [stopPolling]);

  return {
    messages,
    discoveredChats,
    polling,
    error,
    botUserId,
    startPolling,
    stopPolling,
    fetchUpdates,
  };
};
