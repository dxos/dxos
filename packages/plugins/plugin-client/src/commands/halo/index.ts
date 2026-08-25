//
// Copyright 2025 DXOS.org
//

import * as Command from 'effect/unstable/cli/Command';

import { credential } from './credential';
import { identity } from './identity';
import { keys } from './keys';
import { seed } from './seed';
import { share } from './share';
import { update } from './update';

// `create`, `join`, and `recover` are superseded by `dx account signup` / `dx account login`: a
// local identity the hub has not authorized has no Account, so nothing it writes is admitted.
// `share` stays for the CLI-first pairing flow, which runs over the edge messenger rather than the
// raw p2p that `join` and the `device-invitation` login method need and bun does not support.

export const halo: Command.Command<any, any, any, any, any> = Command.make('halo').pipe(
  Command.withDescription('Manage HALO identity.'),
  Command.withSubcommands([credential, identity, keys, seed, share, update]),
);
