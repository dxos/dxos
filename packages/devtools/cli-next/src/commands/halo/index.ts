//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';

import { create } from './create';
import { credential } from './credential';
import { identity } from './identity';
// TODO(wittjosiah): Omitted currently due to p2p networking not working in bun.
// import { join } from './join';
import { keys } from './keys';
import { recover } from './recover';
import { seed } from './seed';
import { share } from './share';
import { update } from './update';

export const halo = Command.make('halo').pipe(
  Command.withDescription('Manage HALO identity.'),
  Command.withSubcommands([create, credential, identity, keys, recover, seed, share, update]),
);
