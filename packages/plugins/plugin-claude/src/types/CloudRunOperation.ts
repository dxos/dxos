//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { TrajectoryStore } from '@dxos/assistant';
import * as Chat from '@dxos/assistant/Chat';
import { RemoteProcessManager } from '@dxos/compute-runtime';
import * as Credential from '@dxos/compute/Credential';
import * as Instructions from '@dxos/compute/Instructions';
import * as Operation from '@dxos/compute/Operation';
import * as Project from '@dxos/compute/Project';
import * as Trace from '@dxos/compute/Trace';
import * as Trigger from '@dxos/compute/Trigger';
import { Database, DXN, Feed, Ref } from '@dxos/echo';
import { AccessToken } from '@dxos/link';
import { Text } from '@dxos/schema';
import { PullRequest, Repo, Task, TaskSet } from '@dxos/types';
import { trim } from '@dxos/util';

//
// A cloud coding run started and folded by an operation rather than by a Composer client, so an MCP client (or EDGE
// itself) hands tasks to Claude Code on EDGE. The agent works on in its container between calls; each call folds what
// it has produced into the chat and says whether the turn has ended.
//

/** Everything a run reads or writes in the space: an EDGE bundle's database knows only the types an operation names. */
const types = [
  Chat.Chat,
  Feed.Feed,
  ...TrajectoryStore.types,
  Task.Task,
  TaskSet.TaskSet,
  Project.Project,
  Instructions.Instructions,
  Text.Text,
  Repo.Repo,
  PullRequest.PullRequest,
  AccessToken.AccessToken,
  // Starting a run files the timer trigger that drives it.
  Trigger.Trigger,
];

const RunState = Schema.Struct({
  chat: Ref.Ref(Chat.Chat).annotate({ description: 'The chat the run lives in; pass it to Sync Cloud Coding Run.' }),
  done: Schema.Boolean.annotate({
    description:
      'Whether the turn has ended. While false the agent is still working: call Sync Cloud Coding Run again.',
  }),
  latest: Schema.optional(Schema.String).annotate({
    description:
      'What the agent did last in the run, its text or the tool it called, so the caller can follow it; at most 2000 characters.',
  }),
  pullRequests: Schema.Array(Schema.String).annotate({
    description:
      'Pull requests the agent opened in this run, as URLs, once the turn has ended; each is attached to the tasks.',
  }),
  merged: Schema.optional(Schema.Boolean).annotate({
    description: 'Whether every pull request of the run has merged, as GitHub reported it when the turn ended.',
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
  services: [
    Database.Service,
    Trace.TraceService,
    Operation.Service,
    Credential.AccessTokenResolver,
    RemoteProcessManager.Service,
  ],
  types,
}).pipe(Operation.mutation('write'));

export const SyncCloudRun = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.claude.syncCloudRun'),
    name: 'Sync Cloud Coding Run',
    icon: 'px--anthropic--regular',
    description: trim`
      Fold what a cloud coding run has produced since the last call into its chat, waiting a few minutes for more.
      When the turn has ended, imports each pull request the agent opened, attaches it to the run's tasks and moves
      them to review, or to done once every one of them has merged; a run that opened none leaves them blocked, with
      the reason in its chat and in \`latest\`. Pass \`prompt\` after the turn has ended to send the agent a follow-up
      in the same chat, such as the person's answer or their approval to land the pull requests.
    `,
  },
  input: Schema.Struct({
    chat: Ref.Ref(Chat.Chat),
    prompt: Schema.optional(Schema.String).annotate({
      description:
        'A follow-up message for the agent, sent only once its turn has ended; it starts a new turn in the same chat and session. Ignored while a turn is still running.',
    }),
  }),
  output: RunState,
  services: [
    Database.Service,
    Trace.TraceService,
    Operation.Service,
    Credential.AccessTokenResolver,
    RemoteProcessManager.Service,
  ],
  types,
}).pipe(Operation.mutation('write'));

export const DriveCloudRuns = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.claude.driveCloudRuns'),
    name: 'Drive Cloud Coding Runs',
    icon: 'px--anthropic--regular',
    description: trim`
      Move every cloud coding run in the space on by one step, with no caller watching: fold a turn that is still
      running; for a turn that has ended, read the run's pull requests from GitHub and either mark the tasks done
      (all merged), ask the agent to fix failed checks, or, once a person has approved landing (an approving review
      or the \`land\` label) and nothing failed, ask it to land the pull requests. Each follow-up is sent once per
      pull request, head commit and kind. A timer trigger in the space runs this every few minutes.
    `,
  },
  input: Schema.Struct({}),
  output: Schema.Struct({
    runs: Schema.Array(
      Schema.Struct({
        chat: Ref.Ref(Chat.Chat),
        step: Schema.Literals(['running', 'idle', 'merged', 'fix', 'land', 'failed', 'deferred']).annotate({
          description:
            'running: the turn is still going; idle: nothing to do yet; merged: every pull request merged; fix or land: the follow-up sent; failed: the step threw, see the log; deferred: the time budget ran out first, so the run goes first next time.',
        }),
      }),
    ),
  }),
  services: [
    Database.Service,
    Trace.TraceService,
    Operation.Service,
    Credential.AccessTokenResolver,
    RemoteProcessManager.Service,
  ],
  types,
}).pipe(Operation.mutation('write'));
