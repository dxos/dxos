//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';
import { type Atom } from 'effect/unstable/reactivity';

import * as Capability from '@dxos/app-framework/Capability';

import { meta } from '#meta';

export const StateSchema = Schema.Struct({
  running: Schema.Boolean,
  showHints: Schema.Boolean,
  showWelcome: Schema.Boolean,
}).mapFields(Struct.map(Schema.mutableKey));

export type State = Schema.Schema.Type<typeof StateSchema>;

export const State = Capability.makeSingleton<Atom.Writable<State>>()(`${meta.profile.key}.capability.state`);
