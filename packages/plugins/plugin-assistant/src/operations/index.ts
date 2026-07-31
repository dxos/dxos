//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';
import { RoutineOperation } from '@dxos/plugin-routine/types';

import { AssistantOperation } from '#types';

export const AssistantOperationHandlerSet = OperationHandlerSet.keyed([
  [AssistantOperation.CreateChat, () => import('./create-chat')],
  [AssistantOperation.EnsureCompanionChat, () => import('./ensure-companion-chat')],
  [AssistantOperation.ForkChat, () => import('./fork-chat')],
  [AssistantOperation.GenerateHomeSuggestions, () => import('./generate-home-suggestions')],
  [AssistantOperation.ResolveNavigationTargets, () => import('./resolve-navigation-targets')],
  [RoutineOperation.RunPromptInNewChat, () => import('./run-prompt-in-new-chat')],
  [AssistantOperation.SetCurrentChat, () => import('./set-current-chat')],
  [AssistantOperation.ToggleTracePanelDebug, () => import('./toggle-trace-panel-debug')],
  [AssistantOperation.UpdateChatName, () => import('./update-chat-name')],
]);
