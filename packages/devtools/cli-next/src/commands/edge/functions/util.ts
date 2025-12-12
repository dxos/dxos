//
// Copyright 2025 DXOS.org
//

import * as Doc from '@effect/printer/Doc';
import * as Ansi from '@effect/printer-ansi/Ansi';
import * as AnsiDoc from '@effect/printer-ansi/AnsiDoc';
import * as Match from 'effect/Match';

import { type Function } from '@dxos/functions';

export type FunctionStatus = 'not imported' | 'up-to-date' | 'update available';

const getStatusColor = Match.type<FunctionStatus>().pipe(
  Match.withReturnType<Ansi.Ansi>(),
  Match.when('not imported', () => Ansi.blackBright),
  Match.when('up-to-date', () => Ansi.green),
  Match.when('update available', () => Ansi.yellow),
  Match.exhaustive,
);

/**
 * Determines the status of a deployed function relative to the space database.
 */
export const getFunctionStatus = (
  deployedFunction: Function.Function,
  dbFunctions: Function.Function[],
): FunctionStatus => {
  const dbFunction = dbFunctions.find((f) => f.key === deployedFunction.key);
  if (!dbFunction) {
    return 'not imported';
  }
  if (dbFunction.version === deployedFunction.version && dbFunction.updated === deployedFunction.updated) {
    return 'up-to-date';
  }
  return 'update available';
};

/**
 * Pretty prints a function with ANSI colors.
 */
export const prettyPrintFunction = (fn: Function.Function, status?: FunctionStatus): string => {
  const name = Doc.annotate(Doc.text(fn.name ?? fn.key ?? 'Unknown'), Ansi.combine(Ansi.bold, Ansi.cyan));
  const key = Doc.cat(Doc.text('  Key: '), Doc.text(fn.key ?? 'N/A'));
  const version = Doc.cat(Doc.text('  Version: '), Doc.text(fn.version ?? 'N/A'));
  const uploaded = Doc.cat(
    Doc.text('  Uploaded: '),
    Doc.text(fn.updated ? new Date(fn.updated).toLocaleString() : 'N/A'),
  );

  const parts = [name, key, version, uploaded];

  if (status) {
    const statusColor = getStatusColor(status);
    const statusDoc = Doc.cat(Doc.text('  Status: '), Doc.annotate(Doc.text(status), statusColor));
    parts.push(statusDoc);
  }

  const doc = Doc.vsep(parts);
  return AnsiDoc.render(doc, { style: 'pretty' });
};
