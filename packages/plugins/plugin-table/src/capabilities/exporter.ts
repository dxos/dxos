//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { Obj, Query, Type } from '@dxos/echo';
import { Table } from '@dxos/react-ui-table/types';
import { htmlTable } from '@dxos/util';

import { type ExportColumn, exportRowsAsJson, getExportCellValue } from '../operations/export-rows-format.ts';

/** Every row the table's view selects, with its visible columns. */
const getRows = (table: Table.Table) =>
  Effect.tryPromise({
    try: async () => {
      const db = Obj.getDatabase(table);
      if (!db) {
        throw new Error('Table is not in a database.');
      }

      const view = await table.view.load();
      const rows = await db.query(Query.fromAst(view.query.ast)).run();
      const columns: ExportColumn[] = view.projection.fields
        .filter((field) => field.visible !== false)
        .map((field) => ({ path: field.path, title: String(field.path), referencePath: field.referencePath }));
      return { rows: rows.filter(Obj.isObject), columns };
    },
    catch: AppCapabilities.ExportError.wrap(),
  });

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const exporter: AppCapabilities.Exporter = {
      id: Type.getTypename(Table.Table),
      save: (table: Table.Table) =>
        getRows(table).pipe(
          Effect.map(({ rows }) => ({
            extension: 'dx.json',
            mimeType: 'application/json;charset=utf-8',
            content: exportRowsAsJson(rows),
          })),
        ),
      print: (table: Table.Table) =>
        getRows(table).pipe(
          Effect.map(({ rows, columns }) =>
            htmlTable(
              rows.map((row) => columns.map((column) => getExportCellValue(row, column))),
              { header: columns.map((column) => column.title) },
            ),
          ),
        ),
    };

    return Capability.contribute(AppCapabilities.Exporter, exporter);
  }),
);
