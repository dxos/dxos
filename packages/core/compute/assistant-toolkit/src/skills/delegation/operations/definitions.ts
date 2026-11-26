//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import * as Agent from '@dxos/compute/Agent';
import * as Operation from '@dxos/compute/Operation';
import * as Process from '@dxos/compute/Process';
import { Database, Ref } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import { Task } from '@dxos/types';
import { trim } from '@dxos/util';

export const DelegateTask = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.assistantToolkit.delegateTask'),
    name: 'Delegate task',
    description: trim`
      Delegate a NEW unit of work to a sub-agent.
      Creates a durable task assigned to an agent; the supervisor spawns a background sub-agent
      for it and reports the result back to the conversation. To delegate tasks that already
      exist on the checklist, use delegate-tasks instead.
    `,
    icon: 'ph--share-network--regular',
  },
  input: Schema.Struct({
    title: Schema.String.annotate({
      description: 'Title of the work to delegate (matched against the checklist, created if new).',
    }),
  }),
  output: Schema.Any,
  services: [Agent.Service, Process.ManagerService, Database.Service],
});

export const DelegateTasks = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.assistantToolkit.delegateTasks'),
    name: 'Delegate tasks',
    description: trim`
      Delegate one or more EXISTING tasks from the conversation's checklist to background
      sub-agents. Select tasks by their checklist ordinal (1-based number) or exact title.
      Each selected task is handed to an agent; the supervisor spawns one sub-agent per task
      once the task's dependencies are done or in review, and reports each result back to the conversation.
    `,
    icon: 'ph--share-network--regular',
  },
  input: Schema.Struct({
    tasks: Schema.Array(Schema.Union([Schema.Number, Schema.String])).annotate({
      description: 'Tasks to delegate: 1-based checklist ordinals and/or exact titles.',
    }),
  }),
  output: Schema.Any,
  services: [Agent.Service, Process.ManagerService, Database.Service],
});

export const ThreadDelegate = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.assistantToolkit.delegateToThread'),
    name: 'Delegate to thread',
    description: trim`
      Delegates a self-contained task to a subagent that runs in a background thread of this session, in parallel
      with you, and returns its thread id at once. The subagent starts with nothing but the task, so state
      everything it needs. Call thread-wait with the id when you need its answer.
    `,
    icon: 'ph--git-fork--regular',
  },
  input: Schema.Struct({
    task: Schema.String.annotate({ description: 'The complete instructions for the subagent.' }),
    purpose: Schema.String.annotate({ description: 'A short title for the task, shown to the reader.' }),
  }),
  output: Schema.String,
  services: [Agent.Service, Process.ManagerService, Database.Service],
});

export const ThreadWait = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.assistantToolkit.waitForThread'),
    name: 'Wait for thread',
    description: trim`
      Waits until another thread of this session has finished, then returns what it did. Call it only when your
      request depends on a result that thread has not produced yet.
    `,
    icon: 'ph--hourglass--regular',
  },
  input: Schema.Struct({
    thread: Schema.String.annotate({ description: 'Id of the thread to wait for.' }),
  }),
  output: Schema.String,
  services: [Agent.Service, Process.ManagerService, Database.Service],
});

export const SessionDelegate = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.assistantToolkit.delegateToSession'),
    name: 'Delegate to session',
    description: trim`
      Hands one task from your checklist to another session: a separate conversation, run by its own process,
      that starts on your model, skills and context. The task becomes the session's, it starts at once, and it
      marks the task done when finished. Use it for a separate work-stream; for light parallel work on your own
      request, delegate to a thread instead.
    `,
    icon: 'ph--chats--regular',
  },
  input: Schema.Struct({
    task: Ref.Ref(Task.Task).annotate({
      description: 'The task to hand over: the `echo://` URI inside the link on its checklist line, as a plain string.',
    }),
    purpose: Schema.String.annotate({ description: 'A short name for the session, shown as its title.' }),
  }),
  output: Schema.String,
  services: [Agent.Service, Process.ManagerService, Database.Service],
});

export const AgentDelegate = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.assistantToolkit.delegateToAgent'),
    name: 'Delegate to agent',
    description: trim`
      Hands a request to another agent in this space, named by its name. The other agent works it in its own
      session, on its own permissions, and starts at once. Use it when another agent holds a permission or a
      specialization you lack, such as when a tool call of yours was refused for want of a permission that agent
      holds. State everything the other agent needs in the message.
    `,
    icon: 'ph--users-three--regular',
  },
  input: Schema.Struct({
    agent: Schema.String.annotate({ description: 'The name of the agent to hand the request to.' }),
    message: Schema.String.annotate({ description: 'The complete request for the other agent.' }),
  }),
  output: Schema.String,
  services: [Agent.Service, Process.ManagerService, Database.Service],
});
