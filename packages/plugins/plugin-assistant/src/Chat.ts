//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { Chat as ChatParts } from './components/Chat/index.ts';

export const { Root, Toolbar, Content, Prompt, Queue, Activity, Status, Thread, Outline } = ChatParts;
export { ObjectCard, ObjectCardWidget, objectCardWidget } from './components/Chat/index.ts';
export type {
  ChatContentProps as ContentProps,
  ChatContextValue as ContextValue,
  ChatEvent as Event,
  ObjectCardProps,
  ObjectCardWidgetProps,
  ChatOutlineProps as OutlineProps,
  ChatPromptProps as PromptProps,
  ChatQueueProps as QueueProps,
  ChatReportContextValue as ReportContextValue,
  ChatRequestTiming as RequestTiming,
  ChatRootProps as RootProps,
  ChatThreadProps as ThreadProps,
  ChatToolbarProps as ToolbarProps,
} from './components/Chat/index.ts';
