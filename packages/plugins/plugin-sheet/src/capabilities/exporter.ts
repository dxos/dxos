//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { getSpace } from '@dxos/client/echo';
import { Type } from '@dxos/echo';
import { parseValue } from '@dxos/react-ui-form';
import { htmlTable } from '@dxos/util';

import { Sheet, SheetCapabilities, SheetUtil } from '#types';

import { SheetModel } from '../model/index.ts';

/** One CSV cell, quoted when needed and neutralized when a spreadsheet would run it as a formula. */
export const escapeCsvCell = (value: string): string => {
  // Spreadsheet apps execute cells beginning with =, +, - or @ even when quoted, so prefix them to keep them inert;
  // a plain number (e.g. `-5`) cannot execute and must stay numeric.
  const isNumber = /^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(value.trim());
  const sanitized = !isNumber && /^\s*[=+\-@]/.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(sanitized) ? `"${sanitized.replace(/"/g, '""')}"` : sanitized;
};

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // Resolved lazily: the compute graph registry activates after this module.
    const capabilities = yield* Capability.Service;

    /** Computed cell text from A1 to the last non-empty cell, as the grid displays it. */
    const getRows = (sheet: Sheet.Sheet) =>
      Effect.acquireUseRelease(
        Effect.tryPromise({
          try: async () => {
            const space = getSpace(sheet);
            if (!space) {
              throw new Error('Sheet is not in a space.');
            }

            const graph = capabilities.get(SheetCapabilities.ComputeGraphRegistry).getOrCreateGraph(space);
            await graph.open();
            const model = new SheetModel(graph, sheet, { readonly: true });
            await model.open();
            return model;
          },
          catch: AppCapabilities.ExportError.wrap(),
        }),
        (model) =>
          Effect.sync(() => {
            let rows = 0;
            let columns = 0;
            for (const [index, cell] of Object.entries(sheet.cells)) {
              if (cell?.value != null && cell.value !== '') {
                const { row, col } = SheetUtil.addressFromIndex(sheet, index);
                rows = Math.max(rows, row + 1);
                columns = Math.max(columns, col + 1);
              }
            }

            return Array.from({ length: rows }, (_, row) =>
              Array.from({ length: columns }, (_, col) => {
                const address = { row, col };
                const description = model.getValueDescription(address);
                const value = parseValue({ ...description, value: model.getValue(address) });
                return value == null ? '' : String(value);
              }),
            );
          }),
        (model) => Effect.promise(() => model.close()),
      );

    const exporter: AppCapabilities.Exporter = {
      id: Type.getTypename(Sheet.Sheet),
      save: (sheet: Sheet.Sheet) =>
        getRows(sheet).pipe(
          Effect.map((rows) => ({
            extension: 'csv',
            mimeType: 'text/csv;charset=utf-8',
            content: rows.map((row) => row.map(escapeCsvCell).join(',')).join('\n'),
          })),
        ),
      print: (sheet: Sheet.Sheet) => getRows(sheet).pipe(Effect.map((rows) => htmlTable(rows))),
    };

    return Capability.contribute(AppCapabilities.Exporter, exporter);
  }),
);
