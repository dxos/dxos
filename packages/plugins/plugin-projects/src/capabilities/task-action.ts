//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { Ref } from '@dxos/echo';
import * as TasksCapabilities from '@dxos/plugin-tasks/TasksCapabilities';

import { MOVE_TASK_DIALOG } from '#meta';
import { ProjectOperation } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributeAll(TasksCapabilities.TaskAction, [
      {
        id: 'delegate-to-chat',
        label: 'Assign to agent',
        icon: 'ph--sparkle--regular',
        // Applies to every task: a conversation about it is always meaningful, so there is nothing
        // to gate on and the list is never empty. The operation takes a list, and the row passes a
        // one-element one, so the row action and the toolbar's checked-set action share one write path.
        createInvocations: (task) => [
          { operation: ProjectOperation.DelegateTaskToChat, input: { tasks: [Ref.make(task)] } },
        ],
      },
      {
        id: 'copy-prompt',
        label: 'Copy prompt',
        icon: 'ph--clipboard-text--regular',
        // Applies to every task for the same reason as the action above: any task can be handed to
        // an agent outside the app, and the operation copies what it renders.
        createInvocations: (task) => [{ operation: ProjectOperation.CopyTaskPrompt, input: { task: Ref.make(task) } }],
      },
      {
        id: 'move-to-project',
        label: 'Move to…',
        icon: 'ph--arrow-square-out--regular',
        // The destination is picked in a dialog, which runs `MoveTaskToSet`; the row cannot list the
        // space's projects itself because an action resolves its invocations synchronously.
        createInvocations: (task) => [
          {
            operation: LayoutOperation.UpdateDialog,
            input: { subject: MOVE_TASK_DIALOG, blockAlign: 'start', props: { task } },
          },
        ],
      },
    ]);
  }),
);
