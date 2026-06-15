//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Obj, Type } from '@dxos/echo';
import { getObjectOnBranch } from '@dxos/echo-client';

import { SheetCapabilities, SheetOperation } from '#types';
import { Sheet } from '#types';

import { parseThreadAnchorAsCellRange } from '../integrations/thread-ranges';

// NOTE: Explicit annotation required: d.ts emit cannot portably name the inferred @dxos/compute types (TS2883).
const activate: () => Effect.Effect<
  Capability.Capability<typeof AppCapabilities.CommentConfig>,
  never,
  Capability.Service
> = Effect.fnUntraced(function* () {
  const capabilities = yield* Capability.Service;
  const config: AppCapabilities.CommentConfig = {
    id: Type.getTypename(Sheet.Sheet),
    comments: 'anchored',
    scrollToAnchor: SheetOperation.ScrollToAnchor,
    // The current cell selection as a range anchor, read from the open sheet's grid.
    getAnchor: (subject: Sheet.Sheet): string | undefined =>
      capabilities.getAll(SheetCapabilities.GridInstances)[0]?.getBySheetId(subject.id)?.getAnchor(),
    // Whether any cell in the anchored range differs from the compare branch (drives the accept UI).
    isOnChange: async (subject: Sheet.Sheet, anchor: string, branch: string): Promise<boolean> => {
      const range = parseThreadAnchorAsCellRange(anchor);
      if (!range) {
        return false;
      }
      const compareData = await getObjectOnBranch(subject, branch);
      const compareCells = (compareData?.cells ?? {}) as Record<string, Sheet.CellValue>;
      for (let col = range.from.col; col <= range.to.col; col++) {
        for (let row = range.from.row; row <= range.to.row; row++) {
          const columnId = subject.columns[col];
          const rowId = subject.rows[row];
          if (
            columnId &&
            rowId &&
            subject.cells[`${columnId}@${rowId}`]?.value !== compareCells[`${columnId}@${rowId}`]?.value
          ) {
            return true;
          }
        }
      }
      return false;
    },
    // Cherry-pick the anchored cells' latest values from `branch` into the current branch. Compares
    // by stable index key (`colId@rowId`), so it tracks value edits; structural row/column changes
    // across the branch are out of scope.
    acceptChange: async (subject: Sheet.Sheet, anchor: string, branch: string): Promise<void> => {
      const range = parseThreadAnchorAsCellRange(anchor);
      if (!range) {
        return;
      }

      const compareData = await getObjectOnBranch(subject, branch);
      // Branch data is untyped (decoded record); the cells map is keyed by `colId@rowId`.
      const compareCells = (compareData?.cells ?? {}) as Record<string, Sheet.CellValue>;
      Obj.update(subject, (subject) => {
        for (let col = range.from.col; col <= range.to.col; col++) {
          for (let row = range.from.row; row <= range.to.row; row++) {
            const columnId = subject.columns[col];
            const rowId = subject.rows[row];
            if (!columnId || !rowId) {
              continue;
            }
            const key = `${columnId}@${rowId}`;
            const compareValue = compareCells[key];
            if (compareValue === undefined) {
              delete subject.cells[key];
            } else {
              subject.cells[key] = { value: compareValue.value };
            }
          }
        }
      });

      // Re-ingest the updated cells into the open sheet's compute engine so the grid reflects the
      // change (the model's incremental updates don't observe this external doc write).
      capabilities.getAll(SheetCapabilities.GridInstances)[0]?.getBySheetId(subject.id)?.reload();
    },
  };
  return Capability.contributes(AppCapabilities.CommentConfig, config);
});

export default activate;
