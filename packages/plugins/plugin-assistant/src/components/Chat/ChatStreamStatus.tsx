//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import React, { useEffect, useMemo, useState } from 'react';

import { ChatStatus, formatElapsed } from '@dxos/react-ui-chat';
import { Matrix } from '@dxos/react-ui-sfx';
import { type ContentBlock } from '@dxos/types';

import { type ChatRequestTiming, useChatContext } from './context';

const CHAT_STREAM_STATUS_NAME = 'Chat.StreamStatus';
const TICK_MS = 1_000;

/**
 * Live status pill rendered at the bottom of the chat thread.
 *
 * The block-widget host re-mounts this component each time wire's drip queue toggles
 * (`wireDrainingEffect`) — so all visible state is derived from chat-context values that
 * survive the unmount: the latest `stats` block on `processor.messages` for token counts,
 * and `requestTiming` (start/end wall-clock timestamps) for the elapsed value.
 *
 * Shows:
 * - elapsed seconds since the most recent request started (frozen at end-of-request)
 * - last completed turn's output token count (from the most recent `stats` content block)
 * - cumulative session total tokens across all `stats` content blocks
 */
export const ChatStreamStatus = () => {
  const { processor, requestTiming } = useChatContext(CHAT_STREAM_STATUS_NAME);
  const messages = useAtomValue(processor.messages);

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

  return (
    <ChatStatus.Root defaultRunning={false} classNames='py-2'>
      <ChatStatus.Icon>
        <Matrix classNames='mr-2' dim={4} size={3} dotSize={3} count={10} interval={500} active={isRunning} />
      </ChatStatus.Icon>
      {requestTiming && (
        <ChatStatus.Text>
          <Elapsed timing={requestTiming} />
        </ChatStatus.Text>
      )}
      {lastOutputTokens != null && (
        <>
          <ChatStatus.Separator />
          <ChatStatus.Text>{lastOutputTokens} tok</ChatStatus.Text>
        </>
      )}
      {sessionTotalTokens > 0 && (
        <>
          <ChatStatus.Separator />
          <ChatStatus.Text>{sessionTotalTokens} session</ChatStatus.Text>
        </>
      )}
    </ChatStatus.Root>
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
  const elapsedMs = (timing.endedAt ?? now) - timing.startedAt;
  return <>{formatElapsed(elapsedMs)}</>;
};

const isStats = (block: ContentBlock.Any): block is ContentBlock.Stats => block._tag === 'stats';
