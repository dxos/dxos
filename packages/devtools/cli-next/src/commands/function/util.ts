//
// Copyright 2025 DXOS.org
//

import * as Prompt from '@effect/cli/Prompt';
import * as Ansi from '@effect/printer-ansi/Ansi';
import * as Effect from 'effect/Effect';
import * as Match from 'effect/Match';

import { ClientService } from '@dxos/client';
import { Database, Filter } from '@dxos/echo';
import { Function } from '@dxos/functions';
import { getDeployedFunctions } from '@dxos/functions-runtime/edge';

import { FormBuilder } from '../../util';

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

/**
 * Pretty prints function invocation result with ANSI colors.
 */
export const printInvokeResult = (result: unknown) => {
  if (result === null || result === undefined) {
    return FormBuilder.of({ title: 'Result' }).set({ key: 'value', value: 'null' }).build();
  }

  if (typeof result === 'string' || typeof result === 'number' || typeof result === 'boolean') {
    return FormBuilder.of({ title: 'Result' })
      .set({ key: 'value', value: String(result) })
      .build();
  }

  if (typeof result === 'object') {
    const builder = FormBuilder.of({ title: 'Result' });
    for (const [key, value] of Object.entries(result)) {
      builder.set({
        key,
        value: typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value),
      });
    }
    return builder.build();
  }

  return FormBuilder.of({ title: 'Result' })
    .set({ key: 'value', value: String(result) })
    .build();
};

/**
 * Selects a deployed function interactively from available functions on EDGE.
 * Queries EDGE for deployed functions and prompts the user to select one by key.
 * Omits functions that are already up-to-date in the database.
 * Indicates whether a function will be imported (new) or updated (existing).
 */
export const selectDeployedFunction = Effect.fn(function* () {
  const client = yield* ClientService;
  const fns = yield* Effect.promise(() => getDeployedFunctions(client));

  if (fns.length === 0) {
    return yield* Effect.fail(new Error('No deployed functions available'));
  }

  // Query database for existing functions to determine status
  const dbFunctions = yield* Database.Service.runQuery(Filter.type(Function.Function));

  // Group functions by key and take the latest version of each
  const functionsByKey = new Map<string, Function.Function>();
  for (const fn of fns) {
    if (fn.key) {
      const existing = functionsByKey.get(fn.key);
      if (!existing || (fn.version && existing.version && fn.version > existing.version)) {
        functionsByKey.set(fn.key, fn);
      }
    }
  }

  const uniqueFunctions = Array.from(functionsByKey.values());

  // Filter out functions that are already up-to-date
  const importableFunctions = uniqueFunctions.filter((fn) => {
    const status = getFunctionStatus(fn, dbFunctions);
    return status !== 'up-to-date';
  });

  if (importableFunctions.length === 0) {
    return yield* Effect.fail(new Error('No functions available to import (all are up-to-date)'));
  }

  const selected = yield* Prompt.select({
    message: 'Select a function to import:',
    choices: importableFunctions.map((fn) => {
      const status = getFunctionStatus(fn, dbFunctions);
      const title = `${fn.name ?? fn.key}${status === 'update available' ? ' (update)' : ''}`;
      const description = `${fn.key} (v${fn.version})${fn.description ? `: ${fn.description}` : ''}`;

      return {
        title,
        value: fn.key,
        description,
      };
    }),
  });

  return String(selected);
});
