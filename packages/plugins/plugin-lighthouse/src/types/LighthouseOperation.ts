//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { Database, DXN, Ref } from '@dxos/echo';

import { Research } from './Research.ts';

const Value = Schema.Union([Schema.String, Schema.Number, Schema.Boolean]);

/** A result's facts as the article holds them, handed to the operations that keep it. */
export const FindingInput = Schema.Struct({
  iri: Schema.String,
  title: Schema.String,
  url: Schema.optional(Schema.String),
  types: Schema.Array(Schema.String),
  images: Schema.Array(Schema.String),
  properties: Schema.Record(Schema.String, Schema.Array(Value)),
  score: Schema.optional(Schema.Number),
  why: Schema.optional(Schema.String),
});

export interface FindingInput extends Schema.Schema.Type<typeof FindingInput> {}

/** An image sent with an input (base64 or a data: URL); lighthouse reads its features before the agent sees it. */
export const InputImage = Schema.Struct({
  data: Schema.String,
  type: Schema.optional(Schema.String),
  name: Schema.optional(Schema.String),
});

const services = [Database.Service, Capability.Service];

export const StartResearch = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.lighthouse.start'),
    name: 'Start research',
    description: "Creates the lighthouse session for a Research's goal and budget, and records its run.",
    icon: 'ph--play--regular',
  },
  input: Schema.Struct({
    research: Ref.Ref(Research),
    /** Images of what to find (at most 4). */
    images: Schema.optional(Schema.Array(InputImage)),
  }),
  output: Schema.String.annotate({ description: 'The run id of the new session.' }),
  services,
});

export const SendToResearch = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.lighthouse.send'),
    name: 'Send to research',
    description: "Sends a follow-up into a Research's session; it is queued while a turn runs.",
    icon: 'ph--paper-plane-right--regular',
  },
  input: Schema.Struct({
    research: Ref.Ref(Research),
    text: Schema.String,
    model: Schema.optional(Schema.String),
    images: Schema.optional(Schema.Array(InputImage)),
  }),
  output: Schema.Void,
  services,
});

export const StopResearch = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.lighthouse.stop'),
    name: 'Stop research',
    description: 'Aborts the turn in flight; the session can be continued later.',
    icon: 'ph--stop--regular',
  },
  input: Schema.Struct({ research: Ref.Ref(Research) }),
  output: Schema.Void,
  services,
});

export const SyncFindings = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.lighthouse.sync'),
    name: 'Sync findings',
    description: "Appends the session's picks that are not in the Research's feed yet, as Findings kept by the pick.",
    icon: 'ph--arrows-clockwise--regular',
  },
  input: Schema.Struct({ research: Ref.Ref(Research), picks: Schema.Array(FindingInput) }),
  output: Schema.Number.annotate({ description: 'Findings appended.' }),
  services: [Database.Service],
});

export const KeepFinding = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.lighthouse.setStarred'),
    name: 'Keep finding',
    description:
      'Stars a result, copying it into the feed with its provenance the first time; unstarring keeps the entry.',
    icon: 'ph--star--regular',
  },
  input: Schema.Struct({ research: Ref.Ref(Research), finding: FindingInput, starred: Schema.Boolean }),
  output: Schema.Void,
  services,
});

export const VoteFinding = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.lighthouse.sendFeedback'),
    name: 'Vote on result',
    description: 'Sends a thumbs up or down (or clear) on a result to lighthouse, which rebuilds the rating model.',
    icon: 'ph--thumbs-up--regular',
  },
  input: Schema.Struct({
    research: Ref.Ref(Research),
    iri: Schema.String,
    vote: Schema.Literals(['up', 'down', 'clear']),
  }),
  output: Schema.Void,
  services,
});

export const ExtendFinding = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.lighthouse.readExtension'),
    name: 'Read more about a result',
    description: 'Reads one extension for one result; deep starts a child research session.',
    icon: 'ph--plus-circle--regular',
  },
  input: Schema.Struct({
    research: Ref.Ref(Research),
    iri: Schema.String,
    extension: Schema.String,
    deep: Schema.optional(Schema.Boolean),
  }),
  output: Schema.Struct({ child: Schema.optional(Schema.String) }),
  services,
});
