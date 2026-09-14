//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
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
  seenTours: Schema.mutable(Schema.Array(Schema.String)).pipe(Schema.withDecodingDefaultKey(Effect.succeed([]))),
}).mapFields(Struct.map(Schema.mutableKey));

export type State = Schema.Schema.Type<typeof StateSchema>;

export const State = Capability.makeSingleton<Atom.Writable<State>>()(`${meta.profile.key}.capability.state`);
