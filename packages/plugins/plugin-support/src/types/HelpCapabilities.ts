//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';
import type * as Atom from 'effect/unstable/reactivity/Atom';

import * as Capability from '@dxos/app-framework/Capability';

import { meta } from '#meta';

export const StateSchema = Schema.Struct({
  running: Schema.Boolean,
  showHints: Schema.Boolean,
  showWelcome: Schema.Boolean,
  tourId: Schema.optional(Schema.String),
  subjectId: Schema.optional(Schema.String),
  /** Legacy device-local record; seeds {@link SeenTours} when help state activates. */
  seenTours: Schema.optional(Schema.Array(Schema.String)),
}).mapFields(Struct.map(Schema.mutableKey));

export type State = Schema.Schema.Type<typeof StateSchema>;

export const State = Capability.makeSingleton<Atom.Writable<State>>()(`${meta.profile.key}.capability.state`);

/** Tours the reader has started, keyed by tour id so each one syncs as its own settings key. */
export const SeenToursSchema = Schema.Record(Schema.String, Schema.Boolean);

export type SeenTours = Schema.Schema.Type<typeof SeenToursSchema>;

export const SeenTours = Capability.makeSingleton<Atom.Writable<SeenTours>>()(
  `${meta.profile.key}.capability.seenTours`,
);
