//
// Copyright 2026 DXOS.org
//

import { useCallback, useEffect, useRef, useState } from 'react';

import { log } from '@dxos/log';

const SLACK_API = 'https://slack.com/api';

export type SlackMessage = {
  ts: string;
  text: string;
  user: string;
  channelId: string;
  channelName: string;
  threadTs?: string;
  replyCount?: number;
};

export type SlackUser = {
  id: string;
  name: string;
  realName?: string;
};

export type SlackThread = {
  channelId: string;
  threadTs: string;
  messages: SlackMessage[];
};

const callSlackApi = async (botToken: string, method: string, params?: Record<string, string>) => {
  const body = new URLSearchParams({ token: botToken, ...params });
  const response = await fetch(`${SLACK_API}/${method}`, { method: 'POST', body });
  const data = await response.json();
  if (!data.ok) {
    const detail = data.needed ? ` (need scope: ${data.needed})` : '';
    throw new Error(`${data.error ?? 'Slack API error'}${detail}`);
  }
  return data;
};

/**
 * Polls Slack channels for recent messages and tracks thread conversations.
 */
export const useSlackMessages = (
  botToken: string | undefined,
  channelIds: string[],
  pollIntervalMs = 10_000,
) => {
  const [messages, setMessages] = useState<SlackMessage[]>([]);
  const [users, setUsers] = useState<Map<string, SlackUser>>(new Map());
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [botUserId, setBotUserId] = useState<string | undefined>();
  // New mentions detected this poll cycle.
  const [pendingMentions, setPendingMentions] = useState<SlackMessage[]>([]);

  const botTokenRef = useRef(botToken);
  const channelIdsRef = useRef(channelIds);
  const usersRef = useRef(users);
  const botUserIdRef = useRef(botUserId);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const channelNamesRef = useRef<Record<string, string>>({});
  // Map from human-friendly name → channel id, populated lazily when settings
  // include names instead of IDs (common first-run state before the demo
  // orchestrator resolved them).
  const nameToIdRef = useRef<Record<string, string>>({});
  const trackedThreadsRef = useRef<Map<string, string>>(new Map());
  const lastReplyTsRef = useRef<Map<string, string>>(new Map());
  // Track all message timestamps we've seen to detect new ones.
  const seenMessagesRef = useRef<Set<string>>(new Set());
  // First poll flag — don't auto-respond to existing messages on startup.
  const firstPollDoneRef = useRef(false);

  // Channel "IDs" coming from settings might actually be names. Slack rejects
  // names on conversations.history with channel_not_found, so normalize here.
  const normalizeChannelIds = useCallback(async (token: string, channels: string[]): Promise<string[]> => {
    // Real Slack channel IDs begin with uppercase C / D / G and have no
    // dashes. Everything else we try to resolve via conversations.list, once.
    const looksLikeId = (value: string): boolean => /^[CDG][A-Z0-9]+$/.test(value);
    const unresolved = channels.filter((channel) => !looksLikeId(channel) && !nameToIdRef.current[channel]);
    if (unresolved.length > 0) {
      try {
        const data = await callSlackApi(token, 'conversations.list', {
          exclude_archived: 'true',
          limit: '1000',
          types: 'public_channel,private_channel',
        });
        for (const entry of (data.channels ?? []) as { id: string; name: string }[]) {
          nameToIdRef.current[entry.name] = entry.id;
        }
      } catch {
        // leave map empty; we'll just pass the name through and the API will 404 again
      }
    }
    return channels.map((channel) => (looksLikeId(channel) ? channel : nameToIdRef.current[channel] ?? channel));
  }, []);

  useEffect(() => { botTokenRef.current = botToken; }, [botToken]);
  useEffect(() => { channelIdsRef.current = channelIds; }, [channelIds]);
  useEffect(() => { usersRef.current = users; }, [users]);
  useEffect(() => { botUserIdRef.current = botUserId; }, [botUserId]);

  const resolveChannelName = useCallback(async (token: string, channelId: string): Promise<string> => {
    if (channelNamesRef.current[channelId]) {
      return channelNamesRef.current[channelId];
    }
    try {
      const data = await callSlackApi(token, 'conversations.info', { channel: channelId });
      const name = data.channel?.name ?? channelId;
      channelNamesRef.current[channelId] = name;
      return name;
    } catch {
      return channelId;
    }
  }, []);

  const resolveUserName = useCallback(async (token: string, userId: string): Promise<SlackUser> => {
    const cached = usersRef.current.get(userId);
    if (cached) {
      return cached;
    }
    try {
      const data = await callSlackApi(token, 'users.info', { user: userId });
      const user: SlackUser = {
        id: data.user.id,
        name: data.user.name,
        realName: data.user.real_name,
      };
      setUsers((prev) => new Map(prev).set(userId, user));
      return user;
    } catch {
      return { id: userId, name: userId };
    }
  }, []);

  const trackThread = useCallback((threadTs: string, channelId: string) => {
    trackedThreadsRef.current.set(threadTs, channelId);
  }, []);

  const fetchThread = useCallback(async (channelId: string, threadTs: string): Promise<SlackMessage[]> => {
    const token = botTokenRef.current;
    if (!token) {
      return [];
    }
    const channelName = await resolveChannelName(token, channelId);
    const data = await callSlackApi(token, 'conversations.replies', { channel: channelId, ts: threadTs });
    const threadMessages: SlackMessage[] = (data.messages ?? []).map(
      (msg: { ts: string; text: string; user: string; thread_ts?: string }) => ({
        ts: msg.ts, text: msg.text, user: msg.user, channelId, channelName, threadTs: msg.thread_ts,
      }),
    );
    for (const msg of threadMessages) {
      await resolveUserName(token, msg.user);
    }
    return threadMessages;
  }, [resolveChannelName, resolveUserName]);

  const checkThreadReplies = useCallback(async (): Promise<{ thread: SlackThread; newReplies: SlackMessage[] }[]> => {
    const token = botTokenRef.current;
    const currentBotId = botUserIdRef.current;
    if (!token) {
      return [];
    }
    const results: { thread: SlackThread; newReplies: SlackMessage[] }[] = [];
    for (const [threadTs, channelId] of trackedThreadsRef.current.entries()) {
      try {
        const threadMessages = await fetchThread(channelId, threadTs);
        const lastSeen = lastReplyTsRef.current.get(threadTs) ?? threadTs;
        const newReplies = threadMessages.filter(
          (msg) => msg.ts > lastSeen && msg.user !== currentBotId,
        );
        if (newReplies.length > 0) {
          const maxTs = newReplies.reduce((max, msg) => (msg.ts > max ? msg.ts : max), lastSeen);
          lastReplyTsRef.current.set(threadTs, maxTs);
          results.push({ thread: { channelId, threadTs, messages: threadMessages }, newReplies });
          log.info('slack: new thread replies', { threadTs, count: newReplies.length });
        }
      } catch (err) {
        log.warn('slack: failed to check thread', { threadTs, error: String(err) });
      }
    }
    return results;
  }, [fetchThread]);

  /** Clear consumed mentions. */
  const clearPendingMentions = useCallback(() => {
    setPendingMentions([]);
  }, []);

  const fetchMessages = useCallback(async () => {
    const token = botTokenRef.current;
    const rawChannels = channelIdsRef.current;
    const currentBotId = botUserIdRef.current;

    if (!token || rawChannels.length === 0) {
      return;
    }

    // Resolve any name-shaped entries to real channel IDs before hitting
    // conversations.history (which 404s on names).
    const channels = await normalizeChannelIds(token, rawChannels);

    // Resolve bot user ID on first fetch.
    if (!currentBotId) {
      try {
        const authData = await callSlackApi(token, 'auth.test');
        setBotUserId(authData.user_id);
        botUserIdRef.current = authData.user_id;
      } catch {
        // Non-fatal.
      }
    }

    setError(undefined);
    const newMessages: SlackMessage[] = [];

    for (const channelId of channels) {
      try {
        const channelName = await resolveChannelName(token, channelId);
        const data = await callSlackApi(token, 'conversations.history', { channel: channelId, limit: '15' });

        const channelMessages = (data.messages ?? [])
          .filter((msg: { subtype?: string }) => !msg.subtype)
          .map((msg: { ts: string; text: string; user: string; thread_ts?: string; reply_count?: number }) => ({
            ts: msg.ts, text: msg.text, user: msg.user, channelId, channelName,
            threadTs: msg.thread_ts, replyCount: msg.reply_count,
          }));

        newMessages.push(...channelMessages);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        if (errorMsg.includes('not_in_channel')) {
          continue;
        }
        log.warn('slack: failed to fetch channel', { channelId, error: errorMsg });
        setError(errorMsg);
      }
    }

    for (const msg of newMessages) {
      await resolveUserName(token, msg.user);
    }

    // Detect new @mentions (only after first poll to avoid responding to old messages).
    if (firstPollDoneRef.current && botUserIdRef.current) {
      const botMention = `<@${botUserIdRef.current}>`;
      const newMentions = newMessages.filter(
        (msg) =>
          !seenMessagesRef.current.has(msg.ts) &&
          msg.user !== botUserIdRef.current &&
          msg.text.includes(botMention),
      );
      if (newMentions.length > 0) {
        log.info('slack: detected @mentions', { count: newMentions.length });
        setPendingMentions((prev) => [...prev, ...newMentions]);
      }
    }

    // Mark all current messages as seen.
    for (const msg of newMessages) {
      seenMessagesRef.current.add(msg.ts);
    }
    firstPollDoneRef.current = true;

    setMessages((prev) => {
      const byTs = new Map(prev.map((msg) => [msg.ts, msg]));
      for (const msg of newMessages) {
        byTs.set(msg.ts, msg);
      }
      return [...byTs.values()]
        .sort((first, second) => Number(first.ts) - Number(second.ts))
        .slice(-100);
    });
  }, [normalizeChannelIds, resolveChannelName, resolveUserName]);

  // In-flight guard so overlapping polls don't queue up when the network is
  // slow or channel count is high. Without this a slow Slack response could
  // cause `fetchMessages` writes to land out of order.
  const fetchInFlightRef = useRef(false);
  const guardedFetch = useCallback(async () => {
    if (fetchInFlightRef.current) {
      return;
    }
    fetchInFlightRef.current = true;
    try {
      await fetchMessages();
    } finally {
      fetchInFlightRef.current = false;
    }
  }, [fetchMessages]);

  const startPolling = useCallback(() => {
    if (intervalRef.current) {
      return;
    }
    setPolling(true);
    log.info('slack: starting polling');
    void guardedFetch();
    intervalRef.current = setInterval(() => void guardedFetch(), pollIntervalMs);
  }, [guardedFetch, pollIntervalMs]);

  const stopPolling = useCallback(() => {
    setPolling(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  const postMessage = useCallback(
    async (channelId: string, text: string, threadTs?: string) => {
      if (!botTokenRef.current) {
        throw new Error('No bot token');
      }
      const params: Record<string, string> = { channel: channelId, text };
      if (threadTs) {
        params.thread_ts = threadTs;
      }
      return callSlackApi(botTokenRef.current, 'chat.postMessage', params);
    },
    [],
  );

  return {
    messages, users, polling, error, botUserId, pendingMentions,
    startPolling, stopPolling, fetchMessages, fetchThread, trackThread,
    checkThreadReplies, clearPendingMentions, postMessage,
  };
};
