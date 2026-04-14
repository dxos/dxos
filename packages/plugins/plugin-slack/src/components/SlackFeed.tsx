//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useRef, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { type Database } from '@dxos/echo';
import { log } from '@dxos/log';
import { AssistantOperation } from '@dxos/plugin-assistant/operations';
import { Button, Icon, ScrollArea } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { type SlackMessage, type SlackUser, useSlackMessages, useSpaceContext } from '#hooks';
import { type SlackCapabilities } from '#types';

export type SlackFeedProps = {
  settings: SlackCapabilities.Settings;
  db: Database.Database;
};

type AgentResponse = {
  messageTs: string;
  text: string;
  status: 'searching' | 'streaming' | 'posting' | 'done' | 'error';
  /** Number of workspace results found during search. */
  contextHits?: number;
};

export const SlackFeed = ({ settings, db }: SlackFeedProps) => {
  const {
    messages, users, polling, error: slackError, botUserId, pendingMentions,
    startPolling, stopPolling, fetchMessages, fetchThread, trackThread,
    checkThreadReplies, clearPendingMentions, postMessage,
  } = useSlackMessages(settings.botToken, settings.monitoredChannels ?? []);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [responses, setResponses] = useState<Map<string, AgentResponse>>(new Map());
  const { invokePromise } = useOperationInvoker();
  const handledRef = useRef<Set<string>>(new Set());
  const { searchContext } = useSpaceContext(db);

  // Auto-scroll on any state change.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages.length, responses]);

  // Auto-start monitoring.
  useEffect(() => {
    if (settings.botToken && (settings.monitoredChannels ?? []).length > 0 && !polling) {
      startPolling();
    }
  }, [settings.botToken, settings.monitoredChannels, polling, startPolling]);

  /** Update a response entry. */
  const updateResponse = useCallback((key: string, update: Partial<AgentResponse>) => {
    setResponses((prev) => {
      const existing = prev.get(key);
      if (!existing) {
        return prev;
      }
      return new Map(prev).set(key, { ...existing, ...update });
    });
  }, []);

  /** Stream AI response and post to Slack. */
  const respondToMessage = useCallback(
    async (responseKey: string, channelId: string, threadTs: string, threadMessages: SlackMessage[]) => {
      const apiKey = globalThis.localStorage?.getItem('ANTHROPIC_API_KEY');
      if (!apiKey) {
        throw new Error('Set ANTHROPIC_API_KEY in localStorage');
      }

      // Phase 1: Search workspace.
      updateResponse(responseKey, { status: 'searching', text: '' });

      const conversationMessages: { role: string; content: string }[] = [];
      for (const msg of threadMessages) {
        const isBot = msg.user === botUserId;
        const userName = users.get(msg.user)?.realName ?? users.get(msg.user)?.name ?? msg.user;
        if (isBot) {
          conversationMessages.push({ role: 'assistant', content: msg.text });
        } else {
          const cleanText = botUserId ? msg.text.replace(new RegExp(`<@${botUserId}>`, 'g'), '').trim() : msg.text;
          conversationMessages.push({
            role: 'user',
            content: threadMessages.length > 1 ? `${userName}: ${cleanText}` : cleanText,
          });
        }
      }

      const latestText = threadMessages[threadMessages.length - 1].text;
      const lastMsg = threadMessages[threadMessages.length - 1];
      const userName = users.get(lastMsg.user)?.realName ?? users.get(lastMsg.user)?.name ?? lastMsg.user;
      const channelName = lastMsg.channelName;

      // Build workspace search query from recent thread context so pronoun
      // follow-ups ("what did we decide on it?") still resolve to the original subject.
      // Include the last few user + assistant turns, not just the latest message.
      const recentContextText = threadMessages
        .slice(-6)
        .map((msg) => (botUserId && msg.user === botUserId
          ? msg.text
          : (botUserId ? msg.text.replace(new RegExp(`<@${botUserId}>`, 'g'), '') : msg.text)))
        .join(' ');
      const searchQuery = threadMessages.length > 1 ? recentContextText : latestText;

      const spaceContext = await searchContext(searchQuery);
      const contextHits = spaceContext ? (spaceContext.match(/^\d+\./gm)?.length ?? 0) : 0;

      log.info('slack: workspace search complete', { contextHits });

      // Fire parallel agent trace for Inspector.
      const tracePrompt = `[Slack #${channelName}] ${userName}: "${latestText}"`;
      void invokePromise(AssistantOperation.RunPromptInNewChat, {
        db,
        prompt: tracePrompt,
        background: true,
      }).catch(() => {});

      // Phase 2: Stream AI response.
      updateResponse(responseKey, { status: 'streaming', text: '', contextHits });

      const systemPrompt = [
        'You are a helpful AI assistant participating in a Slack conversation.',
        'Be concise, friendly, and conversational. Do not use markdown formatting.',
        'Keep responses under 3 paragraphs.',
        '',
        'You have access to the user\'s Composer workspace data (documents, notes, tasks, emails).',
        'When the user asks about their work, projects, or data, use the workspace context below to give informed answers.',
        'If you reference workspace data, mention where the information came from.',
        'If the workspace data doesn\'t contain relevant information, say so honestly.',
        spaceContext,
      ].join('\n');

      const aiResponse = await fetch('/api/anthropic/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 500,
          stream: true,
          system: systemPrompt,
          messages: conversationMessages,
        }),
      });

      if (!aiResponse.ok) {
        const errorBody = await aiResponse.text();
        throw new Error(`AI error ${aiResponse.status}: ${errorBody.slice(0, 200)}`);
      }

      // Parse SSE stream.
      let fullText = '';
      const reader = aiResponse.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) {
              continue;
            }
            const data = line.slice(6);
            if (data === '[DONE]') {
              continue;
            }
            try {
              const event = JSON.parse(data);
              if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
                fullText += event.delta.text;
                updateResponse(responseKey, { text: fullText });
              }
            } catch {
              // Skip malformed events.
            }
          }
        }
      }

      if (!fullText) {
        throw new Error('No response generated');
      }

      // Phase 3: Post to Slack.
      updateResponse(responseKey, { status: 'posting', text: fullText });
      await postMessage(channelId, fullText, threadTs);
      log.info('slack: posted to Slack', { channelId, threadTs, length: fullText.length });

      updateResponse(responseKey, { status: 'done', text: fullText });
      return fullText;
    },
    [botUserId, users, postMessage, invokePromise, db, searchContext, updateResponse],
  );

  /** Handle clicking robot icon. */
  const handleAskAgent = useCallback(
    async (message: SlackMessage) => {
      if (handledRef.current.has(message.ts)) {
        return;
      }
      handledRef.current.add(message.ts);

      setResponses((prev) =>
        new Map(prev).set(message.ts, { messageTs: message.ts, text: '', status: 'searching' }),
      );

      try {
        // If the @mention is inside an existing thread, pull in the full
        // thread history so pronouns and follow-ups resolve correctly.
        const rootTs = message.threadTs ?? message.ts;
        let contextMessages: SlackMessage[] = [message];
        if (message.threadTs) {
          try {
            const thread = await fetchThread(message.channelId, message.threadTs);
            if (thread.length > 0) {
              contextMessages = thread;
            }
          } catch {
            // Fall back to single message if thread fetch fails.
          }
        }
        await respondToMessage(message.ts, message.channelId, rootTs, contextMessages);
        trackThread(rootTs, message.channelId);
        setTimeout(() => void fetchMessages(), 2000);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        setResponses((prev) =>
          new Map(prev).set(message.ts, { messageTs: message.ts, text: errorMsg, status: 'error' }),
        );
        handledRef.current.delete(message.ts);
      }
    },
    [respondToMessage, trackThread, fetchMessages],
  );

  // Auto-respond to @mentions.
  useEffect(() => {
    if (pendingMentions.length === 0) {
      return;
    }
    const mentions = [...pendingMentions];
    clearPendingMentions();
    for (const mention of mentions) {
      if (handledRef.current.has(mention.ts)) {
        continue;
      }
      void handleAskAgent(mention);
    }
  }, [pendingMentions, clearPendingMentions, handleAskAgent]);

  // Auto-respond to thread replies.
  useEffect(() => {
    if (!polling) {
      return;
    }
    const interval = setInterval(async () => {
      try {
        const threadUpdates = await checkThreadReplies();
        for (const { thread, newReplies } of threadUpdates) {
          const lastReply = newReplies[newReplies.length - 1];
          const replyKey = `thread-${lastReply.ts}`;
          if (handledRef.current.has(replyKey)) {
            continue;
          }
          handledRef.current.add(replyKey);

          setResponses((prev) =>
            new Map(prev).set(replyKey, { messageTs: lastReply.ts, text: '', status: 'searching' }),
          );

          try {
            await respondToMessage(replyKey, thread.channelId, thread.threadTs, thread.messages);
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Unknown error';
            setResponses((prev) =>
              new Map(prev).set(replyKey, { messageTs: lastReply.ts, text: errorMsg, status: 'error' }),
            );
            handledRef.current.delete(replyKey);
          }
        }
      } catch {
        // Non-fatal.
      }
    }, 12_000);
    return () => clearInterval(interval);
  }, [polling, checkThreadReplies, respondToMessage]);

  if (!settings.botToken) {
    return (
      <div className='flex flex-col items-center justify-center p-8 gap-3 text-description text-sm'>
        <Icon icon='ph--slack-logo--regular' size={8} classNames='opacity-30' />
        <span>Connect Slack in Settings to get started.</span>
      </div>
    );
  }

  if ((settings.monitoredChannels ?? []).length === 0) {
    return (
      <div className='flex flex-col items-center justify-center p-8 gap-3 text-description text-sm'>
        <Icon icon='ph--hash--regular' size={8} classNames='opacity-30' />
        <span>Select channels to monitor in Settings.</span>
      </div>
    );
  }

  return (
    <div className='flex flex-col h-full'>
      <div className='flex items-center gap-2 px-3 py-2 border-b border-separator'>
        <Icon icon='ph--slack-logo--regular' size={4} />
        <span className='text-sm font-medium flex-1'>Slack</span>
        {polling && (
          <div className='flex items-center gap-1'>
            <div className='size-1.5 rounded-full bg-green-500 animate-pulse' />
            <span className='text-xs text-description'>Live</span>
          </div>
        )}
        <Button variant='ghost' classNames='p-1' onClick={() => void fetchMessages()} title='Refresh'>
          <Icon icon='ph--arrow-clockwise--regular' size={3} />
        </Button>
        {polling ? (
          <Button variant='ghost' classNames='p-1' onClick={stopPolling} title='Stop'>
            <Icon icon='ph--stop--regular' size={3} />
          </Button>
        ) : (
          <Button variant='ghost' classNames='p-1' onClick={startPolling} title='Start'>
            <Icon icon='ph--play--regular' size={3} />
          </Button>
        )}
      </div>

      <ScrollArea.Root className='flex-1'>
        <ScrollArea.Viewport ref={scrollRef} className='max-h-full'>
          {slackError && (
            <div className='px-3 py-2 text-xs text-error rounded m-2'>{slackError}</div>
          )}
          {messages.length === 0 ? (
            <div className='flex flex-col items-center justify-center p-8 gap-2 text-description text-sm'>
              {polling ? (
                <>
                  <Icon icon='ph--spinner-gap--regular' size={5} classNames='animate-spin opacity-30' />
                  <span>Listening for messages...</span>
                </>
              ) : (
                <span>Click play to start monitoring.</span>
              )}
            </div>
          ) : (
            <div className='flex flex-col gap-0.5 p-2'>
              {messages.map((message) => (
                <MessageRow
                  key={message.ts}
                  message={message}
                  user={users.get(message.user)}
                  isBotMessage={message.user === botUserId}
                  response={responses.get(message.ts)}
                  onAskAgent={() => void handleAskAgent(message)}
                />
              ))}
            </div>
          )}
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    </div>
  );
};

const formatTime = (ts: string): string => {
  const date = new Date(Number(ts) * 1000);
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
};

const StatusLabel = ({ status, contextHits }: { status: AgentResponse['status']; contextHits?: number }) => {
  switch (status) {
    case 'searching':
      return (
        <div className='flex items-center gap-1.5'>
          <Icon icon='ph--magnifying-glass--regular' size={3} classNames='animate-pulse text-amber-500' />
          <span>Searching workspace...</span>
        </div>
      );
    case 'streaming':
      return (
        <div className='flex items-center gap-1.5'>
          <Icon icon='ph--brain--regular' size={3} classNames='text-purple-400' />
          <span>
            Generating response
            {contextHits !== undefined && contextHits > 0 && ` (${contextHits} sources found)`}
          </span>
        </div>
      );
    case 'posting':
      return (
        <div className='flex items-center gap-1.5'>
          <Icon icon='ph--paper-plane-right--regular' size={3} classNames='text-primary' />
          <span>Posting to Slack...</span>
        </div>
      );
    case 'done':
      return (
        <div className='flex items-center gap-1'>
          <Icon icon='ph--check--regular' size={2.5} classNames='text-green-500' />
          <span className='text-green-600 dark:text-green-400'>Posted to thread</span>
        </div>
      );
    case 'error':
      return (
        <div className='flex items-center gap-1'>
          <Icon icon='ph--warning--regular' size={2.5} classNames='text-error' />
          <span>Error</span>
        </div>
      );
  }
};

const MessageRow = ({
  message,
  user,
  isBotMessage,
  response,
  onAskAgent,
}: {
  message: SlackMessage;
  user?: SlackUser;
  isBotMessage: boolean;
  response?: AgentResponse;
  onAskAgent: () => void;
}) => {
  const isActive = response?.status === 'searching' || response?.status === 'streaming' || response?.status === 'posting';
  const isDone = response?.status === 'done';

  return (
    <div className='flex flex-col'>
      <div className={mx('group flex gap-2 px-2 py-1 rounded-sm', !isBotMessage && 'hover:bg-hoverSurface')}>
        <div className={mx('mt-0.5 shrink-0 size-5 rounded-full flex items-center justify-center text-[10px]', isBotMessage ? 'bg-primary/20' : 'bg-neutral-200 dark:bg-neutral-700')}>
          {isBotMessage ? (
            <Icon icon='ph--robot--regular' size={3} />
          ) : (
            <span>{(user?.realName ?? user?.name ?? '?')[0].toUpperCase()}</span>
          )}
        </div>

        <div className='flex flex-col flex-1 min-w-0'>
          <div className='flex items-center gap-1.5'>
            <span className={mx('text-xs font-semibold', isBotMessage && 'text-primary')}>
              {isBotMessage ? 'Composer Agent' : (user?.realName ?? user?.name ?? message.user)}
            </span>
            <span className='text-[10px] text-description'>{formatTime(message.ts)}</span>
            {message.replyCount !== undefined && message.replyCount > 0 && (
              <span className='text-[10px] text-primary font-medium'>
                {message.replyCount} {message.replyCount === 1 ? 'reply' : 'replies'}
              </span>
            )}
          </div>
          <p className={mx('text-sm break-words', isBotMessage && 'text-description')}>{message.text}</p>
        </div>

        {!isBotMessage && !isDone && !isActive && (
          <div className='flex items-start pt-1 opacity-0 group-hover:opacity-100 transition-opacity'>
            <Button
              variant='ghost'
              classNames='p-0.5 rounded-full'
              onClick={onAskAgent}
              title='Ask Agent to respond'
            >
              <Icon icon='ph--robot--regular' size={3.5} />
            </Button>
          </div>
        )}
      </div>

      {/* Agent response area */}
      {response && (
        <div className={mx(
          'ml-7 mr-2 mt-0.5 mb-1 rounded-sm text-xs',
          response.status === 'error' ? 'text-error bg-error/10 px-2.5 py-1.5' : 'border-l-2 border-primary/40 px-2.5 py-1.5',
        )}>
          <div className='text-[10px] font-medium mb-0.5'>
            <StatusLabel status={response.status} contextHits={response.contextHits} />
          </div>

          {/* Streaming text — appears word by word. */}
          {response.text && (
            <p className={mx(
              'break-words whitespace-pre-wrap',
              response.status === 'streaming' ? 'text-foreground' : 'text-description',
            )}>
              {response.text}
              {response.status === 'streaming' && (
                <span className='inline-block w-1.5 h-3 bg-primary/60 animate-pulse ml-0.5 -mb-0.5' />
              )}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
