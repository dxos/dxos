// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Table } from '@dxos/react-ui-table/types';
import { ViewModel } from '@dxos/schema';

import { TableOperation } from '../types';

const handler: Operation.WithHandler<typeof TableOperation.Create> = TableOperation.Create.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ db, name, typename }) {
      const { view, jsonSchema } = yield* Effect.promise(() => ViewModel.makeFromDatabase({ db, typename }));
      const table = Table.make({ name, view, jsonSchema });
      return { object: table };
    }),
  ),
);

export default handler;
