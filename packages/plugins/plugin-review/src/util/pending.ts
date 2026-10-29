//
// Copyright 2026 DXOS.org
//

import { type Message } from '@dxos/types';

/** Shown in the thread from the moment the agent starts until its reply lands. */
export const PENDING_TEXT = 'Working on it...';

/** Replaces the pending message when the turn fails or never settles (e.g. no reachable model). */
export const FAILED_TEXT = "Sorry, I couldn't respond.";

const isPending = (message: Message.Message): boolean =>
  message.sender.role === 'assistant' &&
  message.blocks.length === 1 &&
  message.blocks[0]._tag === 'text' &&
  message.blocks[0].text === PENDING_TEXT;

/**
 * Drops a pending message once an assistant reply follows it. The reply lands in the feed before the turn removes the
 * placeholder, so without this both show for a moment and the reply jumps when the placeholder goes.
 */
export const hideSupersededPending = (messages: readonly Message.Message[]): Message.Message[] =>
  messages.filter(
    (message, index) =>
      !isPending(message) || !messages.slice(index + 1).some((later) => later.sender.role === 'assistant'),
  );
