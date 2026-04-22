//
// Copyright 2026 DXOS.org
//

import { useCallback, useState } from 'react';

import { type TelegramConnectionStatus } from '#types';

/** Call a Telegram Bot API method. Token is embedded in the URL path. */
const callTelegram = async (botToken: string, method: string, params?: Record<string, string>) => {
  const body = params ? new URLSearchParams(params) : undefined;
  const response = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    method: 'POST',
    body,
  });
  const data = (await response.json()) as { ok: boolean; result?: unknown; description?: string };
  if (!data.ok) {
    throw new Error(data.description ?? 'Telegram API error');
  }
  return data.result;
};

export type BotInfo = {
  id: number;
  username: string;
  firstName: string;
};

/** Lightweight Telegram Bot API client. */
export const useTelegramApi = (botToken?: string) => {
  const [status, setStatus] = useState<TelegramConnectionStatus>('disconnected');
  const [botInfo, setBotInfo] = useState<BotInfo | undefined>();
  const [error, setError] = useState<string | undefined>();

  const testConnection = useCallback(async () => {
    if (!botToken) {
      setStatus('disconnected');
      return false;
    }
    setStatus('connecting');
    setError(undefined);
    try {
      const result = (await callTelegram(botToken, 'getMe')) as {
        id: number;
        is_bot: boolean;
        first_name: string;
        username: string;
      };
      setBotInfo({ id: result.id, username: result.username, firstName: result.first_name });
      setStatus('connected');
      return true;
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  }, [botToken]);

  const sendMessage = useCallback(
    async (chatId: string | number, text: string, replyToMessageId?: number) => {
      if (!botToken) {
        throw new Error('No bot token configured');
      }
      const params: Record<string, string> = { chat_id: String(chatId), text };
      if (replyToMessageId) {
        params.reply_to_message_id = String(replyToMessageId);
      }
      return callTelegram(botToken, 'sendMessage', params);
    },
    [botToken],
  );

  return { status, botInfo, error, testConnection, sendMessage };
};
