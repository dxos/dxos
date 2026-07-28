//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

// Agent is defined alongside Chat (`./Chat`): the two types reference each other and separate
// modules would form an import cycle. This facade keeps the `Agent.*` namespace stable.
export {
  Agent,
  type MakeProps,
  getFromChatContext,
  loadChat,
  loadInstructions,
  makeInitialized,
  resetChatHistory,
} from './Chat';
