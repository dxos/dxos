//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import React, { useEffect, useMemo, useRef } from 'react';

import { ChatStatus, type ChatStatusController, useChatStatusContext } from '@dxos/react-ui-chat';
import { Matrix } from '@dxos/react-ui-sfx';
import { type ContentBlock } from '@dxos/types';

import { useChatContext } from './context';

const CHAT_STREAM_STATUS_NAME = 'Chat.StreamStatus';

/**
 * Live status pill rendered at the bottom of the chat thread. The widget is mounted at all
 * times; the stopwatch is started/stopped imperatively as the underlying request fiber
 * transitions between active and idle.
 *
 * Shows:
 * - elapsed seconds, ticking only while the request is active
 * - last completed turn's output token count (from the most recent `stats` content block)
 * - cumulative session total tokens across all `stats` content blocks
 */
export const ChatStreamStatus = () => {
  const { processor } = useChatContext(CHAT_STREAM_STATUS_NAME);
  const active = useAtomValue(processor.active);
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

  const controllerRef = useRef<ChatStatusController>(null);
  useEffect(() => {
    if (active) {
      controllerRef.current?.start();
    } else {
      controllerRef.current?.stop();
    }
  }, [active]);

  return (
    <ChatStatus.Root ref={controllerRef} defaultRunning={false} classNames='py-2'>
      <ChatStatus.Icon>
        <MatrixIcon />
      </ChatStatus.Icon>
      <ChatStatus.Stopwatch />
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

const MatrixIcon = () => {
  const { running } = useChatStatusContext('MatrixIcon');
  return <Matrix classNames='mr-2' dim={4} size={3} dotSize={3} count={10} interval={500} active={running} />;
};

const isStats = (block: ContentBlock.Any): block is ContentBlock.Stats => block._tag === 'stats';
