// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as NavigationOperation from '@dxos/app-toolkit/NavigationOperation';
import * as Operation from '@dxos/compute/Operation';
import { Obj, Type } from '@dxos/echo';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';

import { TableOperation } from '#types';

const handler: Operation.WithHandler<typeof TableOperation.OnTypeAdded> = TableOperation.OnTypeAdded.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ db, type }) {
      const { object } = yield* Operation.invoke(TableOperation.Create, {
        db,
        typename: Type.getTypename(type),
      });
      yield* Operation.invoke(SpaceOperation.AddObject, { object }, { spaceId: db.spaceId });
      const { targets } = yield* Operation.invoke(NavigationOperation.ResolveNavigationTargets, {
        query: { uri: Obj.getURI(object) },
      });
      const navigationTarget = targets[0];
      if (navigationTarget) {
        yield* Operation.invoke(LayoutOperation.Open, { subject: [navigationTarget.path], navigation: 'immediate' });
      }
    }),
  ),
);

export default handler;
