// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';

import { SpaceOperation } from '#types';

const handler: Operation.WithHandler<typeof SpaceOperation.OpenMembers> = SpaceOperation.OpenMembers.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      yield* Operation.invoke(LayoutOperation.Open, {
        // The members panel node segment is `members`, nested under the space settings section
        // (`settings`). Opening the section alone addresses a node with nothing to render.
        subject: [GraphPath.getSpacePath(input.space.id, 'settings', 'members')],
        workspace: GraphPath.getSpacePath(input.space.id),
      });
    }),
  ),
);
export default handler;
