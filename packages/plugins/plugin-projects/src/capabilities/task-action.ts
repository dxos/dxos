//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import { Ref } from '@dxos/echo';
import * as TasksCapabilities from '@dxos/plugin-tasks/TasksCapabilities';

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
    ]);
  }),
);
