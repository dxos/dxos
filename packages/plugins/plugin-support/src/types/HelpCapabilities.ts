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
  /** Id of the registered tour that is running; the welcome tour when absent. */
  tourId: Schema.optional(Schema.String),
  /** Tours already run for this profile. Optional so state persisted before the key decodes. */
  seenTours: Schema.optional(Schema.mutable(Schema.Array(Schema.String))),
}).mapFields(Struct.map(Schema.mutableKey));

export type State = Schema.Schema.Type<typeof StateSchema>;

export const State = Capability.makeSingleton<Atom.Writable<State>>()(`${meta.profile.key}.capability.state`);

/** The recorded tours. */
export const seenTours = (state: State): readonly string[] => state.seenTours ?? [];

/** `state.seenTours` with `tourId` recorded. */
export const withSeenTour = (state: State, tourId: string): string[] => {
  const seen = seenTours(state);
  return seen.includes(tourId) ? [...seen] : [...seen, tourId];
};
