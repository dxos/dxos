//
// Copyright 2025 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as RoutineOperation from '@dxos/plugin-routine/RoutineOperation';

import * as AssistantOperation from '../types/AssistantOperation';

export const AssistantOperationHandlerSet = OperationHandlerSet.keyed([
  [AssistantOperation.CreateChat, () => import('./create-chat')],
  [AssistantOperation.EnsureCompanionChat, () => import('./ensure-companion-chat')],
  [AssistantOperation.ForkChat, () => import('./fork-chat')],
  [AssistantOperation.GenerateHomeSuggestions, () => import('./generate-home-suggestions')],
  [RoutineOperation.RunPromptInNewChat, () => import('./run-prompt-in-new-chat')],
  [AssistantOperation.SetCurrentChat, () => import('./set-current-chat')],
  [AssistantOperation.ToggleTracePanelDebug, () => import('./toggle-trace-panel-debug')],
  [AssistantOperation.UpdateChatName, () => import('./update-chat-name')],
]);
