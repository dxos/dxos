//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Obj } from '@dxos/echo';

import { TableOperation } from '../types';
import { exportRows } from './export-rows-format';

const handler: Operation.WithHandler<typeof TableOperation.ExportRows> = TableOperation.ExportRows.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ format, rows, columns }) {
      const objects = rows.filter((row): row is Obj.Unknown => Obj.isObject(row) || Obj.isSnapshot(row));
      return exportRows(format, objects, columns);
    }),
  ),
);

export default handler;
