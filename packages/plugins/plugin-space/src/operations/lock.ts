// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { Operation } from '@dxos/operation';
import { ObservabilityOperation } from '@dxos/plugin-observability/operations';

import { COMPOSER_SPACE_LOCK } from '../util';

import { SpaceOperation } from './definitions';
import { SpaceOperationConfig } from './helpers';

export default SpaceOperation.Lock.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ space }) {
      Obj.change(space.properties, (p) => {
        p[COMPOSER_SPACE_LOCK] = true;
      });

      const { observability } = yield* Capability.get(SpaceOperationConfig);
      if (observability) {
        yield* Operation.schedule(ObservabilityOperation.SendEvent, {
          name: 'space.lock',
          properties: { spaceId: space.id },
        });
      }
    }),
  ),
);
