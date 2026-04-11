//
// Copyright 2026 DXOS.org
//

import { type ContentBlock, type Message } from '@dxos/types';
import { type StateDispatch } from '@dxos/ui-editor';

/**
 * Minimal surface used to push tool call / result blocks into {@link MarkdownStreamController} widget state.
 */
export type ToolWidgetStateSink = {
  updateWidget<T>(id: string, value: StateDispatch<T>): void;
};

/**
 * Mirrors tool-related branches of {@link blockToMarkdown} so widget props stay in sync with message blocks.
 */
export const applyToolBlockToWidgetState = (context: ToolWidgetStateSink, block: ContentBlock.Any): void => {
  switch (block._tag) {
    case 'toolCall': {
      context.updateWidget<{ blocks: ContentBlock.Any[] }>(block.toolCallId, {
        blocks: [block],
      });
      break;
    }
    case 'toolResult': {
      context.updateWidget<{ blocks: ContentBlock.Any[] }>(block.toolCallId, ({ blocks = [] } = { blocks: [] }) => ({
        blocks: [...blocks, block],
      }));
      break;
    }
    default: {
      break;
    }
  }
};

/**
 * Re-applies tool widget state after a full document replace (e.g. {@link MarkdownStreamController.setContent}),
 * which clears accumulated widget props via `xmlTagResetEffect`.
 */
export const rehydrateToolWidgetsFromMessages = (
  context: ToolWidgetStateSink,
  messages: Message.Message[],
): void => {
  for (const message of messages) {
    for (const block of message.blocks) {
      applyToolBlockToWidgetState(context, block);
    }
  }
};
