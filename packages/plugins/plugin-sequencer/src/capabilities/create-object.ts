//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Type } from '@dxos/echo';
import { SpaceCapabilities, SpaceOperation } from '@dxos/plugin-space';

import { Score } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return [
      Capability.provide(SpaceCapabilities.CreateObjectEntry, {
        id: Type.getTypename(Score.Score),
        createObject: (props: Partial<Parameters<typeof Score.make>[0]> | undefined, options) =>
          Effect.gen(function* () {
            const object = Score.make(props ?? {});
            return yield* Operation.invoke(SpaceOperation.AddObject, {
              object,
              target: options.target,
              targetNodeId: options.targetNodeId,
            });
          }),
      }),
    ];
  }),
);
