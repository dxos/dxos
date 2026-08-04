//
// Copyright 2026 DXOS.org
//

export { MessageDocument } from './MessageDocument';
export type { MessageDocumentProps } from './MessageDocument';
export { messageDocumentChangedEffect, messageDocumentChrome } from './message-document-extension';
export type { MessageAction, MessageDocumentOptions } from './message-document-extension';
export {
  DEFAULT_GAP_DIVIDER_MS,
  DEFAULT_GROUP_WINDOW_MS,
  buildMessageDocumentItems,
  getMessageText,
  renderMessageDocumentItem,
} from './message-document-items';
export type {
  DividerItem,
  MessageDocumentItem,
  MessageDocumentItemOptions,
  MessageItem,
} from './message-document-items';
