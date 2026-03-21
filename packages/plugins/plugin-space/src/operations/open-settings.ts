// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import type { Capability } from '@dxos/app-framework';
import { LayoutOperation, getSpacePath } from '@dxos/app-toolkit';
import { Operation } from '@dxos/operation';

import { SpaceOperation } from './definitions';

export default SpaceOperation.OpenSettings.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      yield* Operation.invoke(LayoutOperation.Open, {
        subject: [`${getSpacePath(input.space.id)}/settings`],
        workspace: getSpacePath(input.space.id),
      });
    }),
  ),
);
