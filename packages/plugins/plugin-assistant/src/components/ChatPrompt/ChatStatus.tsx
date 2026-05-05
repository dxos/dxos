//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useMemo, useState } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { ChatStatus as NaturalChatStatus, formatElapsed } from '@dxos/react-ui-chat';
import { Matrix } from '@dxos/react-ui-sfx';
import { type ContentBlock } from '@dxos/types';
import { Unit } from '@dxos/util';

import { type ChatRequestTiming, useChatContext } from '../Chat/context';

const CHAT_STREAM_STATUS_NAME = 'Chat.StreamStatus';
const TICK_MS = 1_000;

export type ChatStreamStatusProps = ThemedClassName<{
  icon?: boolean;
}>;

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
  const { messages, requestTiming } = useChatContext(CHAT_STREAM_STATUS_NAME);

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

  const isRunning = requestTiming != null && requestTiming.endedAt == null;
  const show = requestTiming || lastOutputTokens || sessionTotalTokens > 0;
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
        <div role='none' className='flex items-center'>
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
