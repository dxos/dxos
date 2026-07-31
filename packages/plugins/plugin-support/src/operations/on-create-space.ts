//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';

import { SupportOperation } from '#types';

const handler: Operation.WithHandler<typeof SupportOperation.OnCreateSpace> = SupportOperation.OnCreateSpace.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ space, isDefault }) {
      // On personal-space creation, land on its Home node (where the Welcome content is shown).
      if (!isDefault) {
        return;
      }
      const homePath = GraphPath.getSpaceHomePath(space.id);
      yield* Operation.invoke(LayoutOperation.Set, { subject: [homePath] });
      // Expose is scheduled because the navtree may not have rendered yet at this point.
      yield* Operation.schedule(LayoutOperation.Expose, { subject: homePath });
    }),
  ),
);

export default handler;
