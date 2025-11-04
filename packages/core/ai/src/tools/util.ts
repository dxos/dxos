//
// Copyright 2025 DXOS.org
//

import { type DataType } from '@dxos/schema';

export const getToolCalls = (message: DataType.Message.Message): DataType.ContentBlock.ToolCall[] => {
  return message.blocks.filter(
    (block): block is DataType.ContentBlock.ToolCall => block._tag === 'toolCall' && block.providerExecuted === false,
  );
};
