//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Agent from '@dxos/assistant/Agent';
import * as Operation from '@dxos/compute/Operation';
import { Database, DXN, Obj, Ref } from '@dxos/echo';
import { RDF, predicateSection } from '@dxos/pipeline-rdf';

import * as BrainService from './BrainService.ts';
import * as Goal from './Goal.ts';

/** A handle on an external identity, e.g. `{ label: 'discord', value: '1234' }` or `{ label: 'did', value: 'did:halo:...' }`. */
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

/** Whether the person said it (`stated`) or the agent concluded it (`inferred`). */
export const Origin = Schema.Literals(['stated', 'inferred']);
export type Origin = Schema.Schema.Type<typeof Origin>;

/** Free-text predicates that hold prose rather than relate two things, so an agent never records a fact with them. */
const PROSE_PREDICATES = new Set(['claim', 'has_note']);

/** The predicates an agent records facts with: the seed vocabulary extraction uses, less its prose predicates. */
export const PREDICATES: RDF.Ontology.Ontology = RDF.Ontology.make(
  RDF.Ontology.DEFAULT.entries.filter(({ name }) => !PROSE_PREDICATES.has(name)),
);

/** Whether a surface form names one of the seed vocabulary's prose predicates. */
export const isProsePredicate = (predicate: string): boolean => {
  const entry = RDF.Ontology.DEFAULT.find(predicate);
  return entry !== undefined && PROSE_PREDICATES.has(entry.name);
};

/** One structured fact for {@link Remember}: subject, predicate and object, as extraction states facts. */
export const RecordedFact = Schema.Struct({
  subject: Ref.Ref(Obj.Unknown).annotate({ description: 'The person, organization or object the fact is about.' }),
  predicate: Schema.String.annotate({ description: predicateSection(PREDICATES) }),
  predicateDescription: Schema.optional(
    Schema.String.annotate({ description: 'One sentence saying what a new predicate relates; only for a new one.' }),
  ),
  object: Schema.optional(
    Ref.Ref(Obj.Unknown).annotate({ description: 'The entity the subject is related to; omit when value is given.' }),
  ),
  value: Schema.optional(
    Schema.String.annotate({
      description:
        'A literal object (a place, a date, a short phrase) when it is not an entity; omit when object is given.',
    }),
  ),
  quote: Schema.optional(Schema.String.annotate({ description: 'The words the fact was stated in, verbatim.' })),
  origin: Schema.optional(Origin.annotate({ description: 'stated if the person said it; inferred otherwise.' })),
  confidence: Schema.optional(Schema.Number.annotate({ description: 'Confidence from 0 to 1.' })),
  supersedes: Schema.optional(
    Schema.Array(Schema.String).annotate({
      description:
        'The ids of facts this one corrects, as Recall returned them; a fact read from a source shares its id with the other facts read from the same words, and all of them are replaced.',
    }),
  ),
});

export interface RecordedFact extends Schema.Schema.Type<typeof RecordedFact> {}

/** Records structured facts in the agent's brain, each stated by the agent. */
export const Remember = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.agent.recordFacts'),
    name: 'Remember',
    description:
      'Records facts: each relates a subject (resolved with ResolveEntity) by a predicate to an entity or a literal value. To correct a fact, record the correction with supersedes.',
    icon: 'ph--brain--regular',
  },
  services: [Database.Service, BrainService.BrainService],
  input: Schema.Struct({
    agent: Schema.optional(
      Ref.Ref(Agent.Agent).annotate({ description: "The agent you run as; defaults to the space's only agent." }),
    ),
    facts: Schema.Array(RecordedFact).annotate({ description: 'The facts to record (at least one).' }),
    source: Schema.optional(Ref.Ref(Obj.Unknown).annotate({ description: 'The message or chat they came from.' })),
  }),
  output: Schema.Struct({
    facts: Schema.Array(Schema.String).annotate({ description: 'The ids of the recorded facts, in order.' }),
  }),
});

export const RecalledGoal = Schema.Struct({
  goal: Ref.Ref(Goal.Goal),
  title: Schema.String,
  horizon: Goal.Horizon,
  status: Goal.Status,
});

/** A fact in the agent's brain: one it read in a source or one it recorded. */
export const RecalledFact = Schema.Struct({
  id: Schema.String.annotate({ description: "The fact's id, to pass as supersedes when correcting it." }),
  fact: Schema.String.annotate({ description: 'Subject, predicate and object.' }),
  quote: Schema.optional(Schema.String),
  speaker: Schema.optional(Schema.String.annotate({ description: 'Who stated it, when known.' })),
  source: Schema.String.annotate({ description: 'DXN of the message or object it came from, or a URL.' }),
  sourceName: Schema.optional(Schema.String),
  saidAt: Schema.String.annotate({ description: 'When it was said.' }),
});

/** Reads back what the agent knows: the facts that still hold, newest first, and live goals. */
export const Recall = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.agent.retrieveFacts'),
    name: 'Recall',
    description:
      'Returns the facts about a subject (newest first), read from documents and conversations or recorded with Remember, and the goals it owns.',
    icon: 'ph--magnifying-glass--regular',
  },
  services: [Database.Service, BrainService.BrainService],
  input: Schema.Struct({
    subject: Schema.optional(Ref.Ref(Obj.Unknown).annotate({ description: 'The entity to recall; all if omitted.' })),
    query: Schema.optional(Schema.String.annotate({ description: 'Only facts containing every word of this text.' })),
    // Models often pass a number as a string; refusing it fails the whole call with a schema error.
    limit: Schema.optional(
      Schema.Union([Schema.Number, Schema.NumberFromString]).annotate({
        description: 'Maximum number of facts.',
      }),
    ),
  }),
  output: Schema.Struct({
    queryMatched: Schema.optional(
      Schema.Boolean.annotate({
        description: 'False when the query matched nothing and everything about the subject is returned instead.',
      }),
    ),
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

/** Regenerates the subject's profile document from its goals and the facts about it. */
export const UpdateProfile = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.agent.updateProfile'),
    name: 'Update profile',
    description: "Rewrites the subject's profile document from its goals and the facts about it.",
    icon: 'ph--identification-card--regular',
  },
  services: [Database.Service, BrainService.BrainService],
  input: Schema.Struct({
    subject: Ref.Ref(Obj.Unknown).annotate({ description: 'The person or organization.' }),
  }),
  output: Schema.Struct({
    document: Ref.Ref(Obj.Unknown),
  }),
});
