//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import * as SpaceCapabilities from '@dxos/plugin-space/SpaceCapabilities';

import * as TableOperation from '../types/TableOperation.ts';

export default Capability.makeModule(() =>
  Effect.succeed([
    Capability.contribute(SpaceCapabilities.OnTypeAdded, ({ db, type, show }) =>
      Operation.invoke(TableOperation.OnTypeAdded, { db, type, show }),
    ),
  ]),
);
