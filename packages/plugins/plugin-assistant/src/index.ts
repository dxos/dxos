//
// Copyright 2023 DXOS.org
//

export * from './blueprints';
export * from './meta';
export * from './types';

// Public chat-prompt primitives, so other plugins can embed the full assistant prompt (e.g. the
// space home page in plugin-support) without reaching into plugin-assistant internals.
export { ChatPrompt, type ChatPromptProps } from './components/ChatPrompt';
export { type ChatEvent } from './components/Chat/events';
export { useChatProcessor, useChatServices, useOnline, usePresets } from './hooks';
export { type AiChatProcessor } from './processor';
