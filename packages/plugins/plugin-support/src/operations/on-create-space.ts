//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { LayoutOperation, getSpacePath } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';

import { SupportOperation } from '#types';

import { SPACE_HOME_NODE_ID } from '../constants';

const handler: Operation.WithHandler<typeof SupportOperation.OnCreateSpace> = SupportOperation.OnCreateSpace.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ space, isDefault }) {
      // On personal-space creation, land on its Home node (where the Welcome content is shown).
      if (!isDefault) {
        return;
      }
      const homePath = `${getSpacePath(space.id)}/${SPACE_HOME_NODE_ID}`;
      yield* Operation.invoke(LayoutOperation.SetLayoutMode, { mode: 'solo', subject: homePath });
      // Expose is scheduled because the navtree may not have rendered yet at this point.
      yield* Operation.schedule(LayoutOperation.Expose, { subject: homePath });
    }),
  ),
);

export default handler;
