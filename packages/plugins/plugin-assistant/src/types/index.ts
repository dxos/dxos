//
// Copyright 2024 DXOS.org
//

// Re-export Chat type from assistant-toolkit for public API type declarations.
export type { Chat as ChatType } from '@dxos/assistant-toolkit';

export * as Assistant from './Assistant';

export * from './capabilities';
export { ChatViews, ChatView, ModelProviders, ModelProvider, ModelDefaults } from './Settings';
export * from './events';
export * from './service';
