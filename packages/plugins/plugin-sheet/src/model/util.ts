//
// Copyright 2024 DXOS.org
//

import { randomBytes } from '@dxos/crypto';
import { type FunctionType } from '@dxos/plugin-script';
import { fullyQualifiedId } from '@dxos/react-client/echo';

import { defaultFunctions } from './functions';
import { type CellAddress, type CellRange } from './types';
import { type SheetType } from '../types';

// TODO(wittjosiah): Factor out.
const OBJECT_ID_LENGTH = 60; // 33 (space id) + 26 (object id) + 1 (separator).

// TODO(burdon): Factor out from dxos/protocols to new common package.
export class ApiError extends Error {}
export class ReadonlyException extends ApiError {}
export class RangeException extends ApiError {
  constructor(n: number) {
    super();
  }
}

/**
 * With a string length of 8, the chance of a collision is 0.02% for a sheet with 10,000 strings.
 */
export const createIndex = (length = 8): string => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  const randomBuffer = randomBytes(length);
  return Array.from(randomBuffer, (byte) => characters[byte % charactersLength]).join('');
};

export const createIndices = (length: number): string[] => Array.from({ length }).map(() => createIndex());

/**
 * E.g., "A1" => "CA2@CB3".
 */
export const addressToIndex = (sheet: SheetType, cell: CellAddress): string => {
  return `${sheet.columns[cell.column]}@${sheet.rows[cell.row]}`;
};

/**
 * E.g., "CA2@CB3" => "A1".
 */
export const addressFromIndex = (sheet: SheetType, idx: string): CellAddress => {
  const [column, row] = idx.split('@');
  return {
    column: sheet.columns.indexOf(column),
    row: sheet.rows.indexOf(row),
  };
};

/**
 * E.g., "A1:B2" => "CA2@CB3:CC4@CD5".
 */
export const rangeToIndex = (sheet: SheetType, range: CellRange): string => {
  return [range.from, range.to ?? range.from].map((cell) => addressToIndex(sheet, cell)).join(':');
};

/**
 * E.g., "CA2@CB3:CC4@CD5" => "A1:B2".
 */
export const rangeFromIndex = (sheet: SheetType, idx: string): CellRange => {
  const [from, to] = idx.split(':').map((index) => addressFromIndex(sheet, index));
  return { from, to };
};

// TODO(burdon): Factor out.
export const pickOne = <T>(values: T[]): T => values[Math.floor(Math.random() * values.length)];
export const pickSome = <T>(values: T[], n = 1): T[] => {
  const result = new Set<T>();
  while (result.size < n) {
    result.add(pickOne(values));
  }
  return Array.from(result.values());
};

export const closest = (cursor: CellAddress, cells: CellAddress[]): CellAddress | undefined => {
  let closestCell: CellAddress | undefined;
  let closestDistance = Number.MAX_SAFE_INTEGER;

  for (const cell of cells) {
    const distance = Math.abs(cell.row - cursor.row) + Math.abs(cell.column - cursor.column);
    if (distance < closestDistance) {
      closestCell = cell;
      closestDistance = distance;
    }
  }

  return closestCell;
};

/**
 * Compares the positions of two cell indexes in a sheet.
 * Sorts primarily by row, then by column if rows are equal.
 */
export const compareIndexPositions = (sheet: SheetType, indexA: string, indexB: string): number => {
  const { row: rowA, column: columnA } = addressFromIndex(sheet, indexA);
  const { row: rowB, column: columnB } = addressFromIndex(sheet, indexB);

  // Sort by row first, then by column.
  if (rowA !== rowB) {
    return rowA - rowB;
  } else {
    return columnA - columnB;
  }
};

/**
 * Map from binding to fully qualified ECHO ID.
 */
export const mapFormulaBindingToId =
  (functions: FunctionType[]) =>
  (formula: string): string => {
    return formula.replace(/([a-zA-Z0-9]+)\((.*)\)/g, (match, binding, args) => {
      if (defaultFunctions.find((fn) => fn.name === binding) || binding === 'EDGE') {
        return match;
      }

      const fn = functions.find((fn) => fn.binding === binding);
      if (fn) {
        return `${fullyQualifiedId(fn)}(${args})`;
      } else {
        return match;
      }
    });
  };

/**
 * Map from fully qualified ECHO ID to binding.
 */
export const mapFormulaBindingFromId =
  (functions: FunctionType[]) =>
  (formula: string): string => {
    return formula.replace(/([a-zA-Z0-9]+):([a-zA-Z0-9]+)\((.*)\)/g, (match, spaceId, objectId, args) => {
      const id = `${spaceId}:${objectId}`;
      if (id.length !== OBJECT_ID_LENGTH) {
        return match;
      }

      const fn = functions.find((fn) => fullyQualifiedId(fn) === id);
      if (fn?.binding) {
        return `${fn.binding}(${args})`;
      } else {
        return match;
      }
    });
  };
