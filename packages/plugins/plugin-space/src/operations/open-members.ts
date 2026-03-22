// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import { LayoutOperation, getSpacePath } from '@dxos/app-toolkit';
import { Operation } from '@dxos/operation';

import { SpaceOperation } from './definitions';

const handler: Operation.WithHandler<typeof SpaceOperation.OpenMembers> = SpaceOperation.OpenMembers.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      yield* Operation.invoke(LayoutOperation.Open, {
        subject: [`${getSpacePath(input.space.id)}/settings`],
        workspace: getSpacePath(input.space.id),
      });
    }),
  ),
);
export default handler;
