//
// Copyright 2025 DXOS.org
//

import { type ContentBlock, type Message } from '@dxos/types';

export const getToolCalls = (message: Message.Message): ContentBlock.ToolCall[] => {
  return message.blocks.filter(
    (block): block is ContentBlock.ToolCall => block._tag === 'toolCall' && block.providerExecuted === false,
  );
};
