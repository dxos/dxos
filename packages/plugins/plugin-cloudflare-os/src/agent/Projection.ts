//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { type ContentBlock } from '@dxos/types';

import { type Protocol } from '#api';

/** Request ids this agent issues, so `respond` can tell what an answer is for. */
export type RequestTarget = { kind: 'merge'; chatId: number } | { kind: 'action'; actionId: number };

export const MERGE_OPTIONS: ContentBlock.RequestOption[] = [
  { id: 'accept', label: 'Accept changes', kind: 'allow_once' },
  { id: 'revert', label: 'Revert', kind: 'reject_once' },
];

export const ACTION_OPTIONS: ContentBlock.RequestOption[] = [
  { id: 'approve', label: 'Approve', kind: 'allow_once' },
  { id: 'reject', label: 'Reject', kind: 'reject_once' },
];

export const encodeRequestId = (target: RequestTarget): string =>
  target.kind === 'merge' ? `cloudflare-os:merge:${target.chatId}` : `cloudflare-os:action:${target.actionId}`;

export const decodeRequestId = (requestId: string): RequestTarget | undefined => {
  const match = /^cloudflare-os:(merge|action):(\d+)$/.exec(requestId);
  if (!match) {
    return undefined;
  }
  const id = Number(match[2]);
  return match[1] === 'merge' ? { kind: 'merge', chatId: id } : { kind: 'action', actionId: id };
};

/** A tool call as one line of text: the workspace's tools act there, so Composer only reports them. */
const toolLine = (call: Protocol.ToolCall): string => {
  const input = call.input && typeof call.input === 'object' ? call.input : undefined;
  const subject =
    input && 'filename' in input && typeof input.filename === 'string'
      ? ` ${input.filename}`
      : input && 'title' in input && typeof input.title === 'string'
        ? ` "${input.title}"`
        : '';
  return `\`${call.toolName}\`${subject}${call.error ? ` (failed: ${call.error})` : ''}`;
};

/**
 * The blocks a workspace message becomes in a Composer chat: an agent message's reasoning, tool calls
 * and text. User messages are Composer's own, and change records surface as a request at turn end.
 */
export const messageBlocks = (message: Protocol.ChatMessage): ContentBlock.Any[] => {
  if (message.author.type !== 'agent' || message.type !== 'message' || !('message' in message)) {
    return [];
  }
  const blocks: ContentBlock.Any[] = [];
  if ('reasoning' in message && message.reasoning) {
    blocks.push({ _tag: 'reasoning', reasoningText: message.reasoning });
  }
  if ('toolCalls' in message && message.toolCalls && message.toolCalls.length > 0) {
    blocks.push({ _tag: 'text', text: message.toolCalls.map((call) => `- ${toolLine(call)}`).join('\n') });
  }
  if (message.message) {
    blocks.push({ _tag: 'text', text: message.message });
  }
  return blocks;
};

/** Asks whether to keep the gadget changes a turn proposed. */
export const mergeRequest = (chatId: number, gadgets: readonly string[]): ContentBlock.Request => ({
  _tag: 'request',
  requestId: encodeRequestId({ kind: 'merge', chatId }),
  title: gadgets.length > 0 ? `Accept changes to ${gadgets.join(', ')}?` : 'Accept the proposed changes?',
  options: MERGE_OPTIONS,
});

/** Asks whether to let a gatekeeper perform an action the agent queued. */
export const actionRequest = (entry: Protocol.ActionLogEntry): ContentBlock.Request => {
  const description = 'description' in entry ? entry.description : undefined;
  return {
    _tag: 'request',
    requestId: encodeRequestId({ kind: 'action', actionId: entry.id }),
    title: description?.title ?? `Perform an action on ${entry.resourceTitle}?`,
    options: ACTION_OPTIONS,
    ...(description?.description && { preview: { label: entry.resourceTitle, text: description.description } }),
  };
};
