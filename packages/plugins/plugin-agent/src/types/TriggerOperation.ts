//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { AiService } from '@dxos/ai';
import * as Agent from '@dxos/assistant/Agent';
import * as Operation from '@dxos/compute/Operation';
import { Database, DXN, Format, Obj, Ref } from '@dxos/echo';
import { Space } from '@dxos/halo';

import * as BrainService from './BrainService.ts';
import * as Goal from './Goal.ts';
import * as Trigger from './Trigger.ts';

/**
 * Starts watching the facts the agent records for an outcome someone wants, under a goal they own;
 * when a matching fact is recorded the agent tells them and marks the goal achieved.
 */
export const WatchFacts = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.agent.watchFacts'),
    name: 'Watch for facts',
    description:
      'Waits for something to happen ("let me know when X") and tells the requester when a fact says it did. Records the outcome as a goal the requester owns.',
    icon: 'ph--binoculars--regular',
  },
  services: [Database.Service, AiService.AiService, BrainService.BrainService, Space.Service],
  input: Schema.Struct({
    agent: Ref.Ref(Agent.Agent).annotate({ description: 'The agent that watches.' }),
    requester: Ref.Ref(Obj.Unknown).annotate({
      description: 'The person who wants the outcome (resolve first); they own the goal and are told when it happens.',
    }),
    request: Schema.optional(
      Schema.String.annotate({
        description: "The requester's words, e.g. 'what is Dima working on? keep me posted'.",
      }),
    ),
    outcome: Schema.optional(
      Schema.String.annotate({
        description:
          'The outcome they want, as a short statement ("Dima\'s indexer PR is up"); recorded as their goal.',
      }),
    ),
    goal: Schema.optional(
      Ref.Ref(Goal.Goal).annotate({ description: 'An existing goal this serves, instead of a new outcome.' }),
    ),
    when: Trigger.FactPattern.annotate({ description: 'What a fact must look like for the outcome to have happened.' }),
    message: Schema.String.annotate({
      description:
        'What to tell them when it happens, written to them; "{fact}" is replaced by the fact that fired it (e.g. "Update on Dima: {fact}").',
    }),
    ongoing: Schema.optional(
      Schema.Boolean.annotate({
        description:
          'True for "keep me posted": keep watching after each update and pass every matching fact on. False/absent for a one-time outcome.',
      }),
    ),
    recipient: Schema.optional(Ref.Ref(Obj.Unknown).annotate({ description: 'Who to tell, when not the requester.' })),
  }),
  output: Schema.Struct({
    trigger: Schema.String.annotate({ description: 'The id of the watch.' }),
    goal: Ref.Ref(Goal.Goal),
  }),
});

/** One active watch. */
export const ListedTrigger = Schema.Struct({
  trigger: Schema.String,
  goal: Schema.optional(Ref.Ref(Goal.Goal)),
  when: Schema.String.annotate({ description: 'The pattern, as one line.' }),
  recipient: Ref.Ref(Obj.Unknown),
  message: Schema.String,
  createdAt: Format.DateTime,
});

export interface ListedTrigger extends Schema.Schema.Type<typeof ListedTrigger> {}

/** Lists the agent's active watches. */
export const ListTriggers = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.agent.listTriggers'),
    name: 'List watches',
    description: 'Lists what the agent is waiting for and who it will tell.',
    icon: 'ph--list-checks--regular',
  },
  services: [Database.Service, BrainService.BrainService, Space.Service],
  input: Schema.Struct({
    agent: Ref.Ref(Agent.Agent).annotate({ description: 'The agent.' }),
  }),
  output: Schema.Struct({
    triggers: Schema.Array(ListedTrigger),
  }),
});

/** Stops a watch, optionally dropping the goal it served. */
export const CancelTrigger = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.agent.cancelTrigger'),
    name: 'Cancel watch',
    description: 'Stops waiting for something, e.g. when the requester no longer needs to know.',
    icon: 'ph--x-circle--regular',
  },
  services: [Database.Service, BrainService.BrainService],
  input: Schema.Struct({
    trigger: Schema.String.annotate({ description: 'The id of the watch.' }),
    dropGoal: Schema.optional(Schema.Boolean.annotate({ description: 'Also mark the goal it served as dropped.' })),
  }),
  output: Schema.Struct({
    cancelled: Schema.Boolean,
  }),
});

/**
 * Runs the agent's time-driven rules (`elapsed`, `every`, `due`) now and delivers what they woke; the
 * host calls it when the brain says the clock next matters (`nextDueAt`), as EDGE's Durable Object
 * alarm does for EDGE's brain.
 */
export const RunDue = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.agent.runDue'),
    name: 'Run due watches',
    description: "Wakes the agent's watches whose time has come and passes their updates on.",
    icon: 'ph--alarm--regular',
  },
  services: [Database.Service, AiService.AiService, BrainService.BrainService],
  input: Schema.Struct({
    agent: Ref.Ref(Agent.Agent).annotate({ description: 'The agent.' }),
  }),
  output: Schema.Struct({
    fired: Schema.Array(Schema.String).annotate({ description: 'The ids of the watches that fired.' }),
    undelivered: Schema.Array(Schema.String).annotate({ description: 'Why a fired update was not delivered.' }),
    nextDueAt: Schema.optional(Format.DateTime.annotate({ description: 'When the clock next matters to a watch.' })),
  }),
});
