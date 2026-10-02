//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import * as Atom from 'effect/unstable/reactivity/Atom';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { Ref } from '@dxos/echo';
import * as AssistantCapabilities from '@dxos/plugin-assistant/AssistantCapabilities';
import * as TasksCapabilities from '@dxos/plugin-tasks/TasksCapabilities';

import { MOVE_TASK_DIALOG, meta } from '#meta';
import { ProjectOperation } from '#types';

const ASSIGN_GROUP = 'assign';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const manager = yield* Capability.Service;
    const registry = yield* Capability.get(Capabilities.AtomRegistry);
    const module = (yield* Capability.CurrentModuleId) ?? meta.profile.key;

    // Contributed here rather than returned, so the menu keeps one order — the default assign, each
    // agent, then the rest — while agents come and go with the plugins that bring them.
    let contributed: TasksCapabilities.TaskAction[] = [];
    const withdraw = () => contributed.forEach((action) => manager.remove(TasksCapabilities.TaskAction, action));
    const sync = (agents: AssistantCapabilities.Agent[]) => {
      withdraw();
      contributed = [ASSIGN, ...agents.map(assignTo), ...OTHERS];
      contributed.forEach((implementation) =>
        manager.contribute({ module, interface: TasksCapabilities.TaskAction, implementation }),
      );
    };
    const unsubscribe = registry.subscribe(manager.atom(AssistantCapabilities.Agent), sync, { immediate: true });
    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        unsubscribe();
        withdraw();
      }),
    );

    return [];
  }),
);

const ASSIGN: TasksCapabilities.TaskAction = {
  id: 'delegate-to-chat',
  label: 'Assign to agent',
  icon: 'ph--sparkle--regular',
  group: ASSIGN_GROUP,
  // Applies to every task: a conversation about it is always meaningful, so there is nothing
  // to gate on and the list is never empty. The operation takes a list, and the row passes a
  // one-element one, so the row action and the toolbar's checked-set action share one write path.
  // No agent named: the reader's default agent takes it; the entries after this one pick one.
  createInvocations: (task) => [{ operation: ProjectOperation.DelegateTaskToChat, input: { tasks: [Ref.make(task)] } }],
};

const OTHERS: TasksCapabilities.TaskAction[] = [
  {
    id: 'copy-prompt',
    label: 'Copy prompt',
    icon: 'ph--clipboard-text--regular',
    // Applies to every task for the same reason as the action above: any task can be handed to
    // an agent outside the app. The host copies what the operation renders, since only the host
    // holds the click the clipboard write needs.
    createInvocations: (task) => [
      {
        operation: ProjectOperation.CopyTaskPrompt,
        input: { task: Ref.make(task) },
        clipboard: (output) => (Schema.is(ProjectOperation.CopyTaskPrompt.output)(output) ? output.prompt : undefined),
      },
    ],
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
];

const assignTo = (agent: AssistantCapabilities.Agent): TasksCapabilities.TaskAction => ({
  id: `assign-to-${agent.id}`,
  label: `Assign to ${agent.label}`,
  icon: agent.icon,
  group: ASSIGN_GROUP,
  unavailable: Atom.make((get) => {
    const availability = get(agent.availability);
    return availability.available ? undefined : availability.reason;
  }),
  createInvocations: (task) => [
    { operation: ProjectOperation.DelegateTaskToChat, input: { tasks: [Ref.make(task)], harness: agent.id } },
  ],
});
