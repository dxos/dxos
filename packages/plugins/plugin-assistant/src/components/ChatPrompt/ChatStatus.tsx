//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useMemo, useState } from 'react';

import { Icon, type ThemedClassName } from '@dxos/react-ui';
import { ChatStatus as NaturalChatStatus, formatElapsed } from '@dxos/react-ui-chat';
import { Matrix } from '@dxos/react-ui-components';
import { type ContentBlock } from '@dxos/types';
import { Unit } from '@dxos/util';

import { type ChatRequestTiming, useChatContext } from '../Chat/context.ts';

const CHAT_STREAM_STATUS_NAME = 'Chat.StreamStatus';
const TICK_MS = 1_000;

export type ChatStreamStatusProps = ThemedClassName<{
  icon?: boolean;
}>;

export type ChatStatusViewProps = ChatStreamStatusProps & {
  /** Start/end of the most recent request; `endedAt: null` while it runs. */
  requestTiming?: ChatRequestTiming | null;
  /** Output tokens of the last completed turn. */
  lastOutputTokens?: number;
  /** Cumulative tokens across the session. */
  sessionTotalTokens?: number;
  /**
   * When the agent will next wake itself, if an alarm is pending. Plain values rather than the feed
   * record: this component only renders, and a live ECHO object cannot survive being passed as a
   * Storybook arg (its proxy rejects the mutation Storybook's arg handling performs).
   */
  alarm?: { wakeAt: number; message?: string };
};

/**
 * Live status pill rendered at the bottom of the chat thread.
 *
 * The block-widget host re-mounts this component each time wire's drip queue toggles
 * (`wireDrainingEffect`) — so all visible state is derived from chat-context values that
 * survive the unmount: the latest `stats` block on the chat context's `messages` for token counts,
 * and `requestTiming` (start/end wall-clock timestamps) for the elapsed value.
 *
 * Shows:
 * - elapsed seconds since the most recent request started (frozen at end-of-request)
 * - last completed turn's output token count (from the most recent `stats` content block)
 * - cumulative session total tokens across all `stats` content blocks
 */
export const ChatStatus = ({ classNames, icon }: ChatStreamStatusProps) => {
  // Read `messages` from the chat context (combines `useQuery(queue)` + the processor's
  // pending atom) rather than `processor.messages` directly — the latter only contains
  // blocks streamed via the ephemeral `PartialBlock` channel, while finalized blocks
  // (including the per-turn `stats` block we read for token counts) are submitted to the
  // feed via `_submitMessage` and only show up through `useQuery`.
  const { messages, requestTiming, alarms } = useChatContext(CHAT_STREAM_STATUS_NAME);

  const { lastOutputTokens, sessionTotalTokens } = useMemo(() => {
    let last: number | undefined;
    let total = 0;
    for (const message of messages) {
      for (const block of message.blocks) {
        if (isStats(block) && block.usage) {
          last = block.usage.outputTokens;
          total += block.usage.totalTokens ?? 0;
        }
      }
    }
    return { lastOutputTokens: last, sessionTotalTokens: total };
  }, [messages]);

  const nextAlarm = alarms.at(0);

  return (
    <ChatStatusView
      classNames={classNames}
      icon={icon}
      requestTiming={requestTiming}
      lastOutputTokens={lastOutputTokens}
      sessionTotalTokens={sessionTotalTokens}
      // The earliest pending alarm is the one that wakes the agent next, so it is the one worth a slot.
      alarm={nextAlarm && { wakeAt: nextAlarm.wakeAt, message: nextAlarm.message }}
    />
  );
};

/**
 * The pill itself, given resolved values. Split from {@link ChatStatus} so each slot — elapsed,
 * tokens, the next alarm — can be mounted and asserted in a story without a live processor.
 */
export const ChatStatusView = ({
  classNames,
  icon,
  requestTiming,
  lastOutputTokens,
  sessionTotalTokens = 0,
  alarm,
}: ChatStatusViewProps) => {
  const isRunning = requestTiming != null && requestTiming.endedAt == null;
  const show = requestTiming || lastOutputTokens || sessionTotalTokens > 0 || alarm != null;
  if (!show) {
    return null;
  }

  return (
    <NaturalChatStatus.Root defaultRunning={false} classNames={['py-2 gap-2 text-sm', classNames]}>
      {icon && (
        <NaturalChatStatus.Icon>
          <Matrix
            classNames='w-5 h-5'
            dotClassNames='bg-primary-500'
            dim={4}
            dotSize={3}
            count={10}
            interval={500}
            active={isRunning}
          />
        </NaturalChatStatus.Icon>
      )}
      {show && (
        <div className='flex items-center'>
          {requestTiming && (
            <NaturalChatStatus.Text>
              <Elapsed timing={requestTiming} />
            </NaturalChatStatus.Text>
          )}
          {lastOutputTokens != null && (
            <>
              {requestTiming && <NaturalChatStatus.Separator />}
              <NaturalChatStatus.Text>↓ {Unit.Thousand(lastOutputTokens).toString()}</NaturalChatStatus.Text>
            </>
          )}
          {sessionTotalTokens > 0 && (
            <>
              {(requestTiming || lastOutputTokens != null) && <NaturalChatStatus.Separator />}
              <NaturalChatStatus.Text>Σ {Unit.Thousand(sessionTotalTokens).toString()}</NaturalChatStatus.Text>
            </>
          )}
          {alarm && (
            <>
              {(requestTiming || lastOutputTokens != null || sessionTotalTokens > 0) && <NaturalChatStatus.Separator />}
              <NaturalChatStatus.Text>
                <span
                  data-testid='assistant.chat-status.alarm'
                  className='flex items-center gap-1'
                  title={alarm.message}
                >
                  <Icon icon='ph--alarm--regular' size={4} />
                  {formatWakeAt(alarm.wakeAt)}
                </span>
              </NaturalChatStatus.Text>
            </>
          )}
        </div>
      )}
    </NaturalChatStatus.Root>
  );
};

/**
 * Wall-clock-derived elapsed display. Tick interval forces a re-render every second while
 * the request is active so the displayed value advances; once `endedAt` is set, the value
 * is frozen and the interval is no longer scheduled.
 */
const Elapsed = ({ timing }: { timing: ChatRequestTiming }) => {
  const isRunning = timing.endedAt == null;
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, [isRunning]);

  return <>{formatElapsed((timing.endedAt ?? now) - timing.startedAt)}</>;
};

const isStats = (block: ContentBlock.Any): block is ContentBlock.Stats => block._tag === 'stats';

/**
 * Wall-clock time an alarm fires. The clock is what the reader needs to act on ("it will wake at
 * 14:20"); a countdown would have to tick, and the alarm can be days out.
 */
export const formatWakeAt = (wakeAt: number): string =>
  new Date(wakeAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
