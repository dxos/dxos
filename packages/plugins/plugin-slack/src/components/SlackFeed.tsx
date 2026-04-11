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
  status: 'thinking' | 'done' | 'error';
};

/**
 * Live Slack feed with autonomous agent responses.
 * - @mentions auto-trigger the agent.
 * - Thread replies auto-continue conversations.
 * - Every response fires a parallel agent trace for Inspector visibility.
 */
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

  // Auto-scroll to bottom.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, responses.size]);

  // Auto-start monitoring when settings are configured.
  useEffect(() => {
    if (settings.botToken && (settings.monitoredChannels ?? []).length > 0 && !polling) {
      startPolling();
    }
  }, [settings.botToken, settings.monitoredChannels, polling, startPolling]);

  /** Call AI with thread context and post response to Slack. */
  const respondToMessage = useCallback(
    async (channelId: string, threadTs: string, threadMessages: SlackMessage[], isAutoMention = false) => {
      const apiKey = globalThis.localStorage?.getItem('ANTHROPIC_API_KEY');
      if (!apiKey) {
        throw new Error('Set ANTHROPIC_API_KEY in localStorage');
      }

      // Build conversation from thread.
      const conversationMessages: { role: string; content: string }[] = [];
      for (const msg of threadMessages) {
        const isBot = msg.user === botUserId;
        const userName = users.get(msg.user)?.realName ?? users.get(msg.user)?.name ?? msg.user;
        if (isBot) {
          conversationMessages.push({ role: 'assistant', content: msg.text });
        } else {
          // Strip the @mention from the text for cleaner prompts.
          const cleanText = botUserId ? msg.text.replace(`<@${botUserId}>`, '').trim() : msg.text;
          conversationMessages.push({
            role: 'user',
            content: threadMessages.length > 1 ? `${userName}: ${cleanText}` : cleanText,
          });
        }
      }

      const lastMsg = threadMessages[threadMessages.length - 1];
      const userName = users.get(lastMsg.user)?.realName ?? users.get(lastMsg.user)?.name ?? lastMsg.user;
      const channelName = lastMsg.channelName;

      log.info('slack: calling AI', { channelName, user: userName, threadLength: conversationMessages.length, isAutoMention });

      // Search ECHO space for relevant context based on the latest message.
      const latestText = threadMessages[threadMessages.length - 1].text;
      const spaceContext = await searchContext(latestText);

      // Fire parallel agent trace for Inspector visibility.
      const tracePrompt = `[Slack #${channelName}] ${userName}: "${latestText}"`;
      void invokePromise(AssistantOperation.RunPromptInNewChat, {
        db,
        prompt: tracePrompt,
        background: true,
      }).catch(() => {});

      // Build system prompt with workspace context.
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

      // Direct AI call for the actual Slack response.
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
          system: systemPrompt,
          messages: conversationMessages,
        }),
      });

      if (!aiResponse.ok) {
        const errorBody = await aiResponse.text();
        throw new Error(`AI error ${aiResponse.status}: ${errorBody.slice(0, 200)}`);
      }

      const data = await aiResponse.json();
      const responseText =
        data.content?.find((block: { type: string }) => block.type === 'text')?.text ?? 'No response generated.';

      await postMessage(channelId, responseText, threadTs);
      log.info('slack: posted to Slack', { channelId, threadTs, length: responseText.length });

      return responseText;
    },
    [botUserId, users, postMessage, invokePromise, db, searchContext],
  );

  /** Handle clicking robot icon. */
  const handleAskAgent = useCallback(
    async (message: SlackMessage) => {
      if (handledRef.current.has(message.ts)) {
        return;
      }
      handledRef.current.add(message.ts);

      setResponses((prev) =>
        new Map(prev).set(message.ts, { messageTs: message.ts, text: '', status: 'thinking' }),
      );

      try {
        const responseText = await respondToMessage(message.channelId, message.ts, [message]);
        trackThread(message.ts, message.channelId);
        setResponses((prev) =>
          new Map(prev).set(message.ts, { messageTs: message.ts, text: responseText, status: 'done' }),
        );
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
      log.info('slack: auto-responding to @mention', {
        user: users.get(mention.user)?.realName ?? mention.user,
        channel: mention.channelName,
      });
      void handleAskAgent(mention);
    }
  }, [pendingMentions, clearPendingMentions, handleAskAgent, users]);

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

          log.info('slack: auto-responding to thread reply', { threadTs: thread.threadTs, threadLength: thread.messages.length });

          setResponses((prev) =>
            new Map(prev).set(replyKey, { messageTs: lastReply.ts, text: '', status: 'thinking' }),
          );

          try {
            const responseText = await respondToMessage(thread.channelId, thread.threadTs, thread.messages);
            setResponses((prev) =>
              new Map(prev).set(replyKey, { messageTs: lastReply.ts, text: responseText, status: 'done' }),
            );
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
      {/* Header */}
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
          <Button variant='ghost' classNames='p-1' onClick={stopPolling} title='Stop monitoring'>
            <Icon icon='ph--stop--regular' size={3} />
          </Button>
        ) : (
          <Button variant='ghost' classNames='p-1' onClick={startPolling} title='Start monitoring'>
            <Icon icon='ph--play--regular' size={3} />
          </Button>
        )}
      </div>

      {/* Message Feed */}
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
  const isThinking = response?.status === 'thinking';
  const isDone = response?.status === 'done';

  return (
    <div className='flex flex-col'>
      <div className={mx('group flex gap-2 px-2 py-1 rounded-sm', !isBotMessage && 'hover:bg-hoverSurface')}>
        {/* Avatar placeholder */}
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

        {!isBotMessage && !isDone && (
          <div className='flex items-start pt-1 opacity-0 group-hover:opacity-100 transition-opacity'>
            <Button
              variant='ghost'
              classNames={mx('p-0.5 rounded-full', isThinking && 'animate-pulse opacity-100')}
              onClick={onAskAgent}
              disabled={isThinking}
              title='Ask Agent to respond'
            >
              <Icon
                icon={isThinking ? 'ph--spinner-gap--regular' : 'ph--robot--regular'}
                size={3.5}
                classNames={isThinking ? 'animate-spin' : undefined}
              />
            </Button>
          </div>
        )}
      </div>

      {/* Agent response inline */}
      {response && response.status !== 'thinking' && response.text && (
        <div className={mx('ml-7 mr-2 mt-0.5 mb-1 px-2.5 py-1.5 rounded-sm text-xs', response.status === 'error' ? 'text-error bg-error/10' : 'border-l-2 border-primary/40')}>
          {response.status === 'done' && (
            <div className='flex items-center gap-1 mb-0.5 text-[10px] text-primary font-medium'>
              <Icon icon='ph--check--regular' size={2.5} />
              <span>Posted to thread</span>
            </div>
          )}
          <p className='break-words whitespace-pre-wrap text-description'>{response.text}</p>
        </div>
      )}

      {/* Thinking indicator */}
      {isThinking && (
        <div className='ml-7 mr-2 mt-0.5 mb-1 flex items-center gap-1.5 text-xs text-primary'>
          <div className='flex gap-0.5'>
            <div className='size-1 rounded-full bg-primary animate-bounce' style={{ animationDelay: '0ms' }} />
            <div className='size-1 rounded-full bg-primary animate-bounce' style={{ animationDelay: '150ms' }} />
            <div className='size-1 rounded-full bg-primary animate-bounce' style={{ animationDelay: '300ms' }} />
          </div>
          <span className='text-[10px]'>Agent is thinking...</span>
        </div>
      )}
    </div>
  );
};
