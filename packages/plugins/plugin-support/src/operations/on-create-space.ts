//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { LayoutOperation, getSpacePath } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';

import { SupportOperation } from '#types';

import { WELCOME_NODE_ID } from '../constants';

const handler: Operation.WithHandler<typeof SupportOperation.OnCreateSpace> = SupportOperation.OnCreateSpace.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ space, isDefault }) {
      // The Welcome node is fully virtual and only emitted for the personal space.
      if (!isDefault) {
        return;
      }
      const welcomePath = `${getSpacePath(space.id)}/${WELCOME_NODE_ID}`;
      yield* Operation.invoke(LayoutOperation.SetLayoutMode, { mode: 'solo', subject: welcomePath });
      // Expose is scheduled because the navtree may not have rendered yet at this point.
      yield* Operation.schedule(LayoutOperation.Expose, { subject: welcomePath });
    }),
  ),
);

export default handler;
