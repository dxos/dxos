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

/** Raw routine status updates (e.g. `Running 01KVB9WBRG…`) carry an opaque ULID, not a useful label. */
const ROUTINE_ULID_STATUS = /^Running [0-9A-HJKMNP-TV-Z]{26}$/i;

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
      // Suppress opaque routine ULID lines so descriptive partial-block / operation-input lines win.
      if (ROUTINE_ULID_STATUS.test(event.data.message.trim())) {
        continue;
      }
      return event.data.message;
    }
  }
  return undefined;
};

export type EphemeralStatusUpdate = 'unchanged' | { readonly line: string };

/**
 * Maps an ephemeral trace message to a task-status update.
 *
 * The status line is "sticky": a message without a pending line (e.g. a completed block during an
 * LLM-thinking gap) leaves the previous line in place rather than clearing it, so the row keeps
 * showing the latest meaningful activity until a new line arrives or the subscription ends.
 */
export const resolveEphemeralStatusUpdate = (message: Trace.Message): EphemeralStatusUpdate => {
  const line = pendingStatusFromEphemeralMessage(message);
  if (line) {
    return { line };
  }
  return 'unchanged';
};
