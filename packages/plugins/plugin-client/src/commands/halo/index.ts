//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';

import { credential } from './credential';
import { identity } from './identity';
import { keys } from './keys';
import { seed } from './seed';
import { update } from './update';

// `create`, `join`, and `recover` are superseded by `dx account login`, which logs in to an
// existing identity via the same methods as Composer (email / atproto / device-invitation /
// recovery-code). Note: `join` was omitted and the `device-invitation` login method may hang —
// both rely on p2p networking which does not work in bun.

export const halo: Command.Command<any, any, any, any> = Command.make('halo').pipe(
  Command.withDescription('Manage HALO identity.'),
  Command.withSubcommands([credential, identity, keys, seed, update]),
);
