//
// Copyright 2026 DXOS.org
//

import { PartialBlock } from '@dxos/assistant';
import { Trace } from '@dxos/compute';
import { type ContentBlock } from '@dxos/types';

/**
 * Approximate streamed token count from partial text (UTF-8 length / 4).
 */
export const estimateTokenCount = (text: string): number =>
  Math.max(1, Math.ceil(new TextEncoder().encode(text).length / 4));

const formatOperationInputStatus = (data: { key: string; name?: string; input: unknown }): string => {
  const name = data.name ?? data.key;
  const bytes = new TextEncoder().encode(JSON.stringify(data.input)).length;
  return `Calling ${name} (${bytes} bytes)...`;
};

/**
 * Formats a pending assistant block for the delegated-task status line.
 */
export const formatPendingBlockStatus = (block: ContentBlock.Any): string | undefined => {
  if (!block.pending) {
    return undefined;
  }

  if (block._tag === 'text') {
    return `Generating ${estimateTokenCount(block.text)} tokens....`;
  }

  if (block._tag === 'toolCall') {
    const bytes = new TextEncoder().encode(block.input).length;
    const name = block.operationName ?? block.name;
    return `Calling ${name} (${bytes} bytes)...`;
  }

  return undefined;
};

/**
 * Reads the latest pending partial block from an ephemeral trace message.
 */
export const pendingStatusFromEphemeralMessage = (message: Trace.Message): string | undefined => {
  for (const event of message.events) {
    if (Trace.isOfType(PartialBlock, event)) {
      const status = formatPendingBlockStatus(event.data.block);
      if (status) {
        return status;
      }
      continue;
    }

    if (Trace.isOfType(Trace.OperationInput, event)) {
      return formatOperationInputStatus(event.data);
    }

    if (Trace.isOfType(Trace.StatusUpdate, event)) {
      return event.data.message;
    }
  }
  return undefined;
};

/**
 * Whether an ephemeral message carries a completed (non-pending) partial block.
 */
export const isCompletedPartialBlockMessage = (message: Trace.Message): boolean => {
  for (const event of message.events) {
    if (!Trace.isOfType(PartialBlock, event)) {
      continue;
    }
    if (!event.data.block.pending) {
      return true;
    }
  }
  return false;
};

export type EphemeralStatusUpdate = 'unchanged' | 'clear' | { readonly line: string };

/**
 * Maps an ephemeral trace message to a task-status update.
 */
export const resolveEphemeralStatusUpdate = (message: Trace.Message): EphemeralStatusUpdate => {
  if (isCompletedPartialBlockMessage(message)) {
    return 'clear';
  }
  const line = pendingStatusFromEphemeralMessage(message);
  if (line) {
    return { line };
  }
  return 'unchanged';
};
