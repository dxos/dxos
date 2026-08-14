//
// Copyright 2026 DXOS.org
//

import { ContentBlock } from '@dxos/types';
import { trim } from '@dxos/util';

/** Ephemeral, per-request context captured at submit time (not part of the durable chat state). */
export type ProcessorRequestContext = {
  selection?: {
    /** Anchor strings (`"${from}:${to}"` cursor pairs) the text was resolved from; enables future in-place actions. */
    anchors: string[];
    text: string;
  };
};

/**
 * Prompt content for a request: the bare message, or — when the request carries selection context —
 * a synthetic block (system-generated user-turn content, hidden from the summary view) ahead of it.
 */
export const createPromptContent = (request: {
  message: string;
  context?: ProcessorRequestContext;
}): string | ContentBlock.Any[] => {
  const selection = request.context?.selection;
  if (!selection?.text.length) {
    return request.message;
  }

  return [
    ContentBlock.Text.make({
      disposition: 'synthetic',
      text: trim`
        The user's current selection in the document they are viewing:
        <selection>
        ${selection.text}
        </selection>
      `,
    }),
    ContentBlock.Text.make({ text: request.message }),
  ];
};
