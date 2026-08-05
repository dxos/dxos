//
// Copyright 2025 DXOS.org
//

import { type ContentBlock, type Message } from '@dxos/types';

// Kept out of `ToolBlock.tsx`: react-refresh only fast-refreshes a module whose
// exports are all components, so values exported beside them force a full page reload on
// every edit.

export const isToolMessage = (message: Message.Message) => {
  return message.blocks.some((block: ContentBlock.Any) => block._tag === 'toolCall' || block._tag === 'toolResult');
};
