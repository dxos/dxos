//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';

import { create } from './create';
import { credential } from './credential';
import { identity } from './identity';
import { keys } from './keys';
import { seed } from './seed';
import { update } from './update';

// `create` provisions a fresh local identity (and personal space) — the primitive a headless
// bootstrap needs. With `--noAgent` it stays fully local (no edge); the default path also creates an
// EDGE agent and syncs. `join`/`recover` stay omitted: they rely on p2p networking that does not work
// in bun. `dx account login` covers logging in to an *existing* identity via email/atproto.

export const halo: Command.Command<any, any, any, any> = Command.make('halo').pipe(
  Command.withDescription('Manage HALO identity.'),
  Command.withSubcommands([create, credential, identity, keys, seed, update]),
);
