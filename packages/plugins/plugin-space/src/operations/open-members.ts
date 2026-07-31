// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';

import { SpaceOperation } from './definitions';

const handler: Operation.WithHandler<typeof SpaceOperation.OpenMembers> = SpaceOperation.OpenMembers.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      yield* Operation.invoke(LayoutOperation.Open, {
        subject: [GraphPath.getSpacePath(input.space.id, 'settings')],
        workspace: GraphPath.getSpacePath(input.space.id),
      });
    }),
  ),
);
export default handler;
