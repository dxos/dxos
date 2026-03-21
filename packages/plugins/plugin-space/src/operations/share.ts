// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import type { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/operation';
import { ObservabilityOperation } from '@dxos/plugin-observability/operations';

import { SpaceOperation } from './definitions';

export default SpaceOperation.Share.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const { space, type, authMethod, multiUse, target } = input;
      const invitation = space.share({ type, authMethod, multiUse, target });

      yield* Operation.schedule(ObservabilityOperation.SendEvent, {
        name: 'space.share',
        properties: {
          spaceId: space.id,
        },
      });

      return invitation;
    }),
  ),
);
