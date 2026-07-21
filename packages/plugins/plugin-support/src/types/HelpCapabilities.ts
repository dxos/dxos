//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { type Atom } from '@effect-atom/atom-react';
import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';

import { meta } from '#meta';

export const StateSchema = Schema.mutable(
  Schema.Struct({
    running: Schema.Boolean,
    showHints: Schema.Boolean,
    showWelcome: Schema.Boolean,
  }),
);

export type State = Schema.Schema.Type<typeof StateSchema>;

export const State = Capability.makeSingleton<Atom.Writable<State>>()(`${meta.profile.key}.capability.state`);
