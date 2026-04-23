// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import { LayoutOperation } from '@dxos/app-toolkit';
import { Type } from '@dxos/echo';
import { Operation } from '@dxos/operation';
import { SpaceOperation } from '@dxos/plugin-space/operations';

import { OnSchemaAdded, Create } from './definitions';

const handler: Operation.WithHandler<typeof OnSchemaAdded> = OnSchemaAdded.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ db, schema }) {
      const { object } = yield* Operation.invoke(Create, {
        db,
        typename: Type.getTypename(schema),
      });
      const { subject } = yield* Operation.invoke(SpaceOperation.AddObject, { target: db, object, hidden: true });
      yield* Operation.invoke(LayoutOperation.Open, { subject });
    }),
  ),
);

export default handler;
