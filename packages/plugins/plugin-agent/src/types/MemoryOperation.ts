//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Operation from '@dxos/compute/Operation';
import { Database, DXN, Obj, Ref } from '@dxos/echo';

import * as Goal from './Goal.ts';
import * as Memory from './Memory.ts';

/** A handle on an external identity, e.g. `{ label: 'discord', value: '1234' }` or `{ label: 'did', value: 'did:halo:…' }`. */
export const Handle = Schema.Struct({
  label: Schema.optional(Schema.String.annotate({ description: 'The identity system, e.g. "discord" or "did".' })),
  value: Schema.String.annotate({ description: 'The id within that system.' }),
});

export type Handle = Schema.Schema.Type<typeof Handle>;

export const EntityKind = Schema.Literals(['person', 'organization']);
export type EntityKind = Schema.Schema.Type<typeof EntityKind>;

/** Finds the Person (or Organization) the agent is talking about, creating it on first mention. */
export const ResolveEntity = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.agent.resolveEntity'),
    name: 'Resolve entity',
    description:
      'Finds the person or organization matching the handles or name, creating it if absent. Call before remembering anything about someone.',
    icon: 'ph--user-focus--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    name: Schema.optional(Schema.String.annotate({ description: 'Full name of the person or organization.' })),
    handles: Schema.optional(
      Schema.Array(Handle).annotate({ description: 'Known identities, e.g. the Discord user id of the sender.' }),
    ),
    kind: Schema.optional(EntityKind.annotate({ description: 'Defaults to person.' })),
  }),
  output: Schema.Struct({
    entity: Ref.Ref(Obj.Unknown),
    created: Schema.Boolean,
  }),
});

/** Records one atomic claim about one or more entities. */
export const Remember = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.agent.recordMemory'),
    name: 'Remember',
    description:
      'Records one atomic third-person claim about the given subjects. To correct an earlier memory, pass it as supersedes.',
    icon: 'ph--brain--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    content: Schema.String.annotate({
      description: 'One atomic third-person claim, e.g. "Rich prefers async updates."',
    }),
    kind: Memory.Kind,
    origin: Schema.optional(
      Memory.Origin.annotate({ description: 'stated if the person said it; inferred otherwise.' }),
    ),
    subjects: Schema.Array(Ref.Ref(Obj.Unknown)).annotate({
      description: 'The entities the claim is about (at least one).',
    }),
    confidence: Schema.optional(Schema.Number.annotate({ description: 'Confidence from 0 to 1.' })),
    source: Schema.optional(Ref.Ref(Obj.Unknown).annotate({ description: 'The message or chat it came from.' })),
    supersedes: Schema.optional(Ref.Ref(Memory.Memory).annotate({ description: 'The memory this one corrects.' })),
    body: Schema.optional(
      Schema.String.annotate({
        description: 'Markdown body, for kind "note": the full notes, with content as their one-line summary.',
      }),
    ),
  }),
  output: Schema.Struct({
    memory: Ref.Ref(Memory.Memory),
  }),
});

export const RecalledMemory = Schema.Struct({
  memory: Ref.Ref(Memory.Memory),
  content: Schema.String,
  kind: Memory.Kind,
  origin: Memory.Origin,
  observedAt: Schema.String,
});

export const RecalledGoal = Schema.Struct({
  goal: Ref.Ref(Goal.Goal),
  title: Schema.String,
  horizon: Goal.Horizon,
  status: Goal.Status,
});

/** A fact the agent read in a source's annotation feed. */
export const RecalledFact = Schema.Struct({
  fact: Schema.String.annotate({ description: 'Subject, predicate and object.' }),
  quote: Schema.optional(Schema.String),
  speaker: Schema.optional(Schema.String.annotate({ description: 'Who stated it, when known.' })),
  source: Schema.String.annotate({ description: 'DXN of the message or object it came from, or a URL.' }),
  sourceName: Schema.optional(Schema.String),
  saidAt: Schema.String.annotate({ description: 'When it was said.' }),
});

/** Reads back what the agent knows: active memories, newest first, facts it read, and live goals. */
export const Recall = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.agent.retrieveMemories'),
    name: 'Recall',
    description:
      'Returns the active memories and the facts read from documents and conversations about a subject (newest first), and the goals it owns.',
    icon: 'ph--magnifying-glass--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    subject: Schema.optional(Ref.Ref(Obj.Unknown).annotate({ description: 'The entity to recall; all if omitted.' })),
    query: Schema.optional(Schema.String.annotate({ description: 'Only memories and facts containing this text.' })),
    limit: Schema.optional(Schema.Number.annotate({ description: 'Maximum number of memories, and of facts.' })),
  }),
  output: Schema.Struct({
    memories: Schema.Array(RecalledMemory),
    facts: Schema.Array(RecalledFact),
    goals: Schema.Array(RecalledGoal),
  }),
});

/** Records a goal the person described; it stays `proposed` until confirmed. */
export const ProposeGoal = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.agent.suggestGoal'),
    name: 'Propose goal',
    description: 'Records a goal the owners described. It stays proposed until they confirm it.',
    icon: 'ph--target--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    title: Schema.String.annotate({ description: 'Short statement of the goal.' }),
    description: Schema.optional(
      Schema.String.annotate({ description: 'Why it matters, by when, obstacles and who is involved.' }),
    ),
    horizon: Goal.Horizon,
    owners: Schema.Array(Ref.Ref(Obj.Unknown)).annotate({
      description: 'The people or organizations that hold the goal (at least one).',
    }),
    parent: Schema.optional(Ref.Ref(Goal.Goal).annotate({ description: 'The goal this one serves.' })),
  }),
  output: Schema.Struct({
    goal: Ref.Ref(Goal.Goal),
  }),
});

/** Moves a goal on once its owner has confirmed it. */
export const ConfirmGoal = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.agent.setGoalStatus'),
    name: 'Confirm goal',
    description: 'Sets the status of a goal the owner has confirmed (defaults to confirmed).',
    icon: 'ph--check-circle--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    goal: Ref.Ref(Goal.Goal),
    status: Schema.optional(Schema.Literals(['confirmed', 'active', 'achieved', 'dropped'])),
  }),
  output: Schema.Struct({
    goal: Ref.Ref(Goal.Goal),
  }),
});

/** Regenerates the subject's profile document from its goals and active memories. */
export const UpdateProfile = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.agent.updateProfile'),
    name: 'Update profile',
    description: "Rewrites the subject's profile document from its goals and active memories.",
    icon: 'ph--identification-card--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    subject: Ref.Ref(Obj.Unknown).annotate({ description: 'The person or organization.' }),
  }),
  output: Schema.Struct({
    document: Ref.Ref(Obj.Unknown),
  }),
});
