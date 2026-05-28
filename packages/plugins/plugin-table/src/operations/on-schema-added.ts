// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import { LayoutOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Type } from '@dxos/echo';
import { SpaceOperation } from '@dxos/plugin-space';

import { TableOperation } from '../types';

const handler: Operation.WithHandler<typeof TableOperation.OnTypeAdded> = TableOperation.OnTypeAdded.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ db, type }) {
      const { object } = yield* Operation.invoke(TableOperation.Create, {
        db,
        typename: Type.getTypename(type),
      });
      const { subject } = yield* Operation.invoke(SpaceOperation.AddObject, { target: db, object, hidden: true });
      yield* Operation.invoke(LayoutOperation.Open, { subject });
    }),
  ),
);

export default handler;
