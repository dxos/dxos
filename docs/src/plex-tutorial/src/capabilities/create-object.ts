//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { Type } from '@dxos/echo';
import * as SpaceCapabilities from '@dxos/plugin-space/SpaceCapabilities';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';

import { StashedLink, make } from '../types/StashedLink.ts';

// #region create-object
export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(SpaceCapabilities.CreateObjectEntry, {
      id: Type.getTypename(StashedLink),
      createObject: (props, options) =>
        Operation.invoke(
          SpaceOperation.AddObject,
          { object: make(props), target: options.target },
          { spaceId: options.db.spaceId },
        ),
    }),
  ),
);
// #endregion
