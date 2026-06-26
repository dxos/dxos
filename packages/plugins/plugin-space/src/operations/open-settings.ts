// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import { LayoutOperation, Paths } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';

import { SpaceOperation } from './definitions';

const handler: Operation.WithHandler<typeof SpaceOperation.OpenSettings> = SpaceOperation.OpenSettings.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      yield* Operation.invoke(LayoutOperation.Open, {
        subject: [Paths.getSpacePath(input.space.id, 'settings', 'general')],
        workspace: Paths.getSpacePath(input.space.id),
      });
    }),
  ),
);
export default handler;
