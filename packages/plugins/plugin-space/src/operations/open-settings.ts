// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import { LayoutOperation, getSpacePath } from '@dxos/app-toolkit';
import { Operation } from '@dxos/operation';

import { SpaceOperation } from './definitions';

const handler: Operation.WithHandler<typeof SpaceOperation.OpenSettings> = SpaceOperation.OpenSettings.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      // The legacy `${spacePath}/settings` alternate-tree panel was flattened —
      // settings children now sit directly under the Space node. Open the
      // General settings entry, which is the equivalent landing page.
      yield* Operation.invoke(LayoutOperation.Open, {
        subject: [`${getSpacePath(input.space.id)}/general`],
        workspace: getSpacePath(input.space.id),
      });
    }),
  ),
);
export default handler;
