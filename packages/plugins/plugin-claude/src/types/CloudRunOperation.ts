//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Chat from '@dxos/assistant/Chat';
import * as Operation from '@dxos/compute/Operation';
import * as Trace from '@dxos/compute/Trace';
import { Database, DXN, Ref } from '@dxos/echo';
import { Task } from '@dxos/types';
import { trim } from '@dxos/util';

import * as CodingAgentControl from '../CodingAgentControl.ts';

//
// A cloud coding run started and folded by an operation rather than by a Composer client, so an MCP client (or EDGE
// itself) hands tasks to Claude Code on EDGE. The agent works on in its container between calls; each call folds what
// it has produced into the chat and says whether the turn has ended.
//

const RunState = Schema.Struct({
  chat: Ref.Ref(Chat.Chat).annotate({ description: 'The chat the run lives in; pass it to Sync Cloud Coding Run.' }),
  done: Schema.Boolean.annotate({
    description:
      'Whether the turn has ended. While false the agent is still working: call Sync Cloud Coding Run again.',
  }),
  pullRequests: Schema.Array(Schema.String).annotate({
    description:
      'Pull requests the agent opened in this run, as URLs, once the turn has ended; each is attached to the tasks.',
  }),
});

export const StartCloudRun = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.claude.startCloudRun'),
    name: 'Start Cloud Coding Run',
    icon: 'px--anthropic--regular',
    description: trim`
      Hand project tasks to Claude Code running on EDGE, on the space's Claude subscription. Creates a chat for the
      tasks under their project, marks them started with the chat as their delegate, and starts the agent in a
      sandbox with the project's repositories checked out. The agent opens a draft pull request per repository it
      changes. Returns the chat; call Sync Cloud Coding Run with it until done.
    `,
  },
  input: Schema.Struct({
    tasks: Schema.Array(Ref.Ref(Task.Task)).annotate({
      description: 'The tasks to hand over; their subtasks come along.',
    }),
    assignee: Schema.optional(
      Schema.Struct({ identityDid: Schema.String, name: Schema.optional(Schema.String) }).annotate({
        description: 'The person a task with no assignee answers to: the identity whoami names.',
      }),
    ),
  }),
  output: RunState,
  services: [Database.Service, Trace.TraceService, Operation.Service, CodingAgentControl.CodingAgentControl],
}).pipe(Operation.mutation('write'));

export const SyncCloudRun = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.claude.syncCloudRun'),
    name: 'Sync Cloud Coding Run',
    icon: 'px--anthropic--regular',
    description: trim`
      Fold what a cloud coding run has produced since the last call into its chat, waiting a few minutes for more.
      When the turn has ended, imports each pull request the agent opened, attaches it to the run's tasks and moves
      them to review.
    `,
  },
  input: Schema.Struct({ chat: Ref.Ref(Chat.Chat) }),
  output: RunState,
  services: [Database.Service, Trace.TraceService, Operation.Service, CodingAgentControl.CodingAgentControl],
}).pipe(Operation.mutation('write'));
