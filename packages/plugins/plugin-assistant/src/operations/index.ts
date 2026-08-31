//
// Copyright 2025 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as RoutineOperation from '@dxos/plugin-routine/RoutineOperation';

import { AssistantOperation } from '#types';

export const AssistantOperationHandlerSet = OperationHandlerSet.lazy([
  AssistantOperation.BindChatContext.pipe(Operation.lazyHandler(() => import('./bind-chat-context'))),
  AssistantOperation.CreateChat.pipe(Operation.lazyHandler(() => import('./create-chat'))),
  AssistantOperation.EnsureCompanionChat.pipe(Operation.lazyHandler(() => import('./ensure-companion-chat'))),
  AssistantOperation.ForkChat.pipe(Operation.lazyHandler(() => import('./fork-chat'))),
  AssistantOperation.GenerateHomeSuggestions.pipe(Operation.lazyHandler(() => import('./generate-home-suggestions'))),
  AssistantOperation.RunPromptInChat.pipe(Operation.lazyHandler(() => import('./run-prompt-in-chat'))),
  RoutineOperation.RunPromptInNewChat.pipe(Operation.lazyHandler(() => import('./run-prompt-in-new-chat'))),
  AssistantOperation.SetCurrentChat.pipe(Operation.lazyHandler(() => import('./set-current-chat'))),
  AssistantOperation.SetTracePanelDebug.pipe(Operation.lazyHandler(() => import('./set-trace-panel-debug'))),
  AssistantOperation.UpdateChatName.pipe(Operation.lazyHandler(() => import('./update-chat-name'))),
]);
