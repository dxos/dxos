//
// Copyright 2025 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as RoutineOperation from '@dxos/plugin-routine/RoutineOperation';

import { AssistantOperation } from '#types';

export const AssistantOperationHandlerSet = OperationHandlerSet.lazy([
  AssistantOperation.BindChatContext.pipe(Operation.lazyHandler(() => import('./bind-chat-context.ts'))),
  AssistantOperation.CreateChat.pipe(Operation.lazyHandler(() => import('./create-chat.ts'))),
  AssistantOperation.EnsureCompanionChat.pipe(Operation.lazyHandler(() => import('./ensure-companion-chat.ts'))),
  AssistantOperation.ForkChat.pipe(Operation.lazyHandler(() => import('./fork-chat.ts'))),
  AssistantOperation.GenerateHomeSuggestions.pipe(
    Operation.lazyHandler(() => import('./generate-home-suggestions.ts')),
  ),
  AssistantOperation.RunPromptInChat.pipe(Operation.lazyHandler(() => import('./run-prompt-in-chat.ts'))),
  RoutineOperation.RunPromptInNewChat.pipe(Operation.lazyHandler(() => import('./run-prompt-in-new-chat.ts'))),
  AssistantOperation.SetCurrentChat.pipe(Operation.lazyHandler(() => import('./set-current-chat.ts'))),
  AssistantOperation.SetTracePanelDebug.pipe(Operation.lazyHandler(() => import('./set-trace-panel-debug.ts'))),
  AssistantOperation.UpdateChatName.pipe(Operation.lazyHandler(() => import('./update-chat-name.ts'))),
]);
