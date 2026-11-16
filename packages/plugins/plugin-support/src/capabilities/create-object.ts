//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { Type } from '@dxos/echo';
import * as SpaceCapabilities from '@dxos/plugin-space/SpaceCapabilities';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';

import { Support } from '#types';

import { type SupportPluginOptions } from '../types/SupportPluginOptions.ts';

export default Capability.makeModule(
  Effect.fnUntraced(function* ({ readOnly = false }: SupportPluginOptions = {}) {
    if (readOnly) {
      return [];
    }
    return Capability.contribute(SpaceCapabilities.CreateObjectEntry, {
      id: Type.getTypename(Support.Ticket),
      createObject: (props, options) =>
        Effect.gen(function* () {
          const object = Support.make(props);
          return yield* Operation.invoke(
            SpaceOperation.AddObject,
            {
              object,
              target: options.target,
            },
            { spaceId: options.db.spaceId },
          );
        }),
    });
  }),
);
