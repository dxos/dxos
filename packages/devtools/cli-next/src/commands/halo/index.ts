//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';

import { create } from './create';
import { identity } from './identity';
// TODO(wittjosiah): Omitted currently due to p2p networking not working in bun.
// import { join } from './join';
import { recover } from './recover';

export const halo = Command.make('halo').pipe(
  Command.withDescription('Manage HALO identity.'),
  Command.withSubcommands([create, identity, recover]),
);
