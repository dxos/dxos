// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import type { View } from '@dxos/echo';
import { Operation } from '@dxos/operation';
import { Table } from '@dxos/react-ui-table/types';
import { ViewModel } from '@dxos/schema';

import { Create } from './definitions';

export default Create.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ db, name, typename }) {
      const { view, jsonSchema } = yield* Effect.promise(() => ViewModel.makeFromDatabase({ db, typename }));
      const table = Table.make({ name, view, jsonSchema });
      return { object: table };
    }),
  ),
);
