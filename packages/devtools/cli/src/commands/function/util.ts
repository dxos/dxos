//
// Copyright 2025 DXOS.org
//

import * as Prompt from '@effect/cli/Prompt';
import * as Ansi from '@effect/printer-ansi/Ansi';
import * as Effect from 'effect/Effect';
import * as Match from 'effect/Match';

import { FormBuilder } from '@dxos/cli-util';
import { Operation } from '@dxos/compute';
import { Database, Filter, Obj } from '@dxos/echo';

export type FunctionStatus = 'not imported' | 'up-to-date' | 'update available';

/**
 * Determines the status of a deployed function relative to the space database.
 */
export const getFunctionStatus = (
  fn: Operation.PersistentOperation,
  functions: Operation.PersistentOperation[],
): FunctionStatus => {
  const fnKey = Obj.getMeta(fn).key;
  const dbFunction = functions.find((f) => Obj.getMeta(f).key === fnKey);
  if (!dbFunction) {
    return 'not imported';
  }
  if (Obj.getMeta(dbFunction).version === Obj.getMeta(fn).version && dbFunction.updated === fn.updated) {
    return 'up-to-date';
  }

  return 'update available';
};

/**
 * Pretty prints a function with ANSI colors.
 */
export const printFunction = (fn: Operation.PersistentOperation, status?: FunctionStatus) => {
  return FormBuilder.make({ title: fn.id }).pipe(
    FormBuilder.set('key', Obj.getMeta(fn).key),
    FormBuilder.set('name', fn.name),
    FormBuilder.set('version', Obj.getMeta(fn).version),
    FormBuilder.set('uploaded', fn.updated),
    FormBuilder.when(
      status != null,
      FormBuilder.set(
        'status',
        status!,
        Match.type<FunctionStatus>().pipe(
          Match.withReturnType<Ansi.Ansi>(),
          Match.when('not imported', () => Ansi.white),
          Match.when('up-to-date', () => Ansi.green),
          Match.when('update available', () => Ansi.yellow),
          Match.exhaustive,
        ),
      ),
    ),
    FormBuilder.build,
  );
};

/**
 * Pretty prints function invocation result with ANSI colors.
 */
export const printInvokeResult = (result: unknown) => {
  if (result === null || result === undefined) {
    return FormBuilder.make({ title: 'Result' }).pipe(FormBuilder.set('value', 'null'), FormBuilder.build);
  }

  if (typeof result === 'string' || typeof result === 'number' || typeof result === 'boolean') {
    return FormBuilder.make({ title: 'Result' }).pipe(FormBuilder.set('value', String(result)), FormBuilder.build);
  }

  if (typeof result === 'object') {
    return FormBuilder.make({ title: 'Result' }).pipe(
      FormBuilder.each(Object.entries(result), ([key, value]) =>
        FormBuilder.set(key, typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value)),
      ),
      FormBuilder.build,
    );
  }

  return FormBuilder.make({ title: 'Result' }).pipe(FormBuilder.set('value', String(result)), FormBuilder.build);
};

/**
 * Selects a deployed function interactively from available functions on EDGE.
 * Queries EDGE for deployed functions and prompts the user to select one by key.
 * Omits functions that are already up-to-date in the database.
 * Indicates whether a function will be imported (new) or updated (existing).
 */
export const selectDeployedFunction = Effect.fn(function* (fns: Operation.PersistentOperation[]) {
  // Query database for existing functions to determine status
  const dbFunctions = yield* Database.query(Filter.type(Operation.PersistentOperation)).run;

  // Filter out functions that are already up-to-date
  const importableFunctions = fns.filter((fn) => {
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
      const meta = Obj.getMeta(fn);
      const title = `${fn.name ?? meta.key}${status === 'update available' ? ' (update)' : ''}`;
      const description = `${meta.key} (v${meta.version})${fn.description ? `: ${fn.description}` : ''}`;

      return {
        title,
        value: meta.key ?? fn.id,
        description,
      };
    }),
  });

  return String(selected);
});
