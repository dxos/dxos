//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import React, { useMemo } from 'react';

import { ChatStatus, useChatStatusContext } from '@dxos/react-ui-chat';
import { Matrix } from '@dxos/react-ui-sfx';
import { type ContentBlock } from '@dxos/types';

import { useChatContext } from './context';

const CHAT_STREAM_STATUS_NAME = 'Chat.StreamStatus';

/**
 * Live status pill rendered at the bottom of the chat thread while a request is in flight.
 *
 * Shows:
 * - elapsed seconds since the request started (resets on each invocation by virtue of the
 *   component remounting when the parent's `active` flips back to true)
 * - last completed turn's output token count (from the most recent `stats` content block)
 * - cumulative session total tokens across all `stats` content blocks
 */
export const ChatStreamStatus = () => {
  const { processor } = useChatContext(CHAT_STREAM_STATUS_NAME);
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

  return (
    <ChatStatus.Root defaultRunning classNames='py-2'>
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
