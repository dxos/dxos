//
// Copyright 2025 DXOS.org
//

import * as Ansi from '@effect/printer-ansi/Ansi';
import * as Match from 'effect/Match';

import { type Function } from '@dxos/functions';

import { FormBuilder } from '../../../util';

export type FunctionStatus = 'not imported' | 'up-to-date' | 'update available';

/**
 * Determines the status of a deployed function relative to the space database.
 */
export const getFunctionStatus = (fn: Function.Function, functions: Function.Function[]): FunctionStatus => {
  const dbFunction = functions.find((f) => f.key === fn.key);
  if (!dbFunction) {
    return 'not imported';
  }
  if (dbFunction.version === fn.version && dbFunction.updated === fn.updated) {
    return 'up-to-date';
  }

  return 'update available';
};

/**
 * Pretty prints a function with ANSI colors.
 */
export const printFunction = (fn: Function.Function, status?: FunctionStatus) =>
  FormBuilder.of({ title: fn.name ?? fn.key ?? 'Unknown' })
    .set({ key: 'id', value: fn.id })
    .set({ key: 'key', value: fn.key ?? fn.id })
    .set({ key: 'version', value: fn.version })
    .set({ key: 'uploaded', value: fn.updated })
    .set({
      key: 'status',
      value: status,
      color: Match.type<FunctionStatus>().pipe(
        Match.withReturnType<Ansi.Ansi>(),
        Match.when('not imported', () => Ansi.white),
        Match.when('up-to-date', () => Ansi.green),
        Match.when('update available', () => Ansi.yellow),
        Match.exhaustive,
      ),
    })
    .build();
