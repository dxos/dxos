//
// Copyright 2025 DXOS.org
//

import { type ContentBlock, type DataType } from '@dxos/schema';

export const getToolCalls = (message: DataType.Message): ContentBlock.ToolCall[] => {
  return message.blocks.filter(
    (block): block is ContentBlock.ToolCall => block._tag === 'toolCall' && block.providerExecuted === false,
  );
};
