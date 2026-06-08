//
// Copyright 2025 DXOS.org
//

import { type Message, type Thread } from '@dxos/types';

/**
 * Returns the concatenated text of all 'text' blocks on a message.
 *
 * Proposal blocks (assistant-authored markdown diffs) are intentionally
 * excluded — gating mentions off a proposal text would be meaningless.
 */
export const textOf = (message: Message.Message | undefined): string => {
  if (!message) {
    return '';
  }
  return message.blocks
    .filter((block): block is Extract<Message.Message['blocks'][number], { _tag: 'text' }> => block._tag === 'text')
    .map((block) => block.text)
    .join('\n');
};

/**
 * Trigger gate for the comment-thread agent.
 *
 * Returns true iff the agent should respond to the latest message. All of:
 *   - `thread.agent` exists and `enabled === true`
 *   - `message.sender.role !== 'assistant'` (structural self-loop guard).
 *     Note: user-authored messages typically have NO role set; only assistant
 *     messages carry an explicit role.
 *   - `thread.status !== 'resolved'`
 *   - Either mode === 'auto', OR text contains an `@{agentName}` mention
 *     (case-insensitive substring match; v1 — promote to a parser later).
 */
export const shouldTriggerAgent = (thread: Thread.Thread, message: Message.Message, agentName: string): boolean => {
  if (!thread.agent?.enabled) {
    return false;
  }
  if (message.sender.role === 'assistant') {
    return false;
  }
  if (thread.status === 'resolved') {
    return false;
  }
  if (thread.agent.mode === 'auto') {
    return true;
  }
  const needle = '@' + agentName.toLowerCase();
  return textOf(message).toLowerCase().includes(needle);
};
