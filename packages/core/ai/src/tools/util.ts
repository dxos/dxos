//
// Copyright 2025 DXOS.org
//

import { type ContentBlock, type DataType } from '@dxos/schema';

export const getToolCalls = (message: DataType.Message): ContentBlock.ToolCall[] => {
  return message.blocks.filter((block) => block._tag === 'toolCall');
};
