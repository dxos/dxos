//
// Copyright 2025 DXOS.org
//

import * as Doc from '@effect/printer/Doc';
import * as Ansi from '@effect/printer-ansi/Ansi';
import * as AnsiDoc from '@effect/printer-ansi/AnsiDoc';
import * as Effect from 'effect/Effect';
import * as Match from 'effect/Match';

import { Database, Obj } from '@dxos/echo';
import { Function, type Trigger } from '@dxos/functions';

/**
 * Gets the trigger kind and detailed spec information.
 */
const getTriggerSpecInfo = (spec: Trigger.Spec | undefined): { kind: string; details: string | undefined } => {
  if (!spec) {
    return { kind: 'No spec defined', details: undefined };
  }

  return Match.value(spec).pipe(
    Match.when({ kind: 'email' }, () => ({
      kind: 'email',
      details: undefined,
    })),
    Match.when({ kind: 'queue' }, (s) => ({
      kind: 'queue',
      details: s.queue ?? 'N/A',
    })),
    Match.when({ kind: 'subscription' }, (s) => ({
      kind: 'subscription',
      details: s.query?.raw ? s.query.raw : '[Query AST]',
    })),
    Match.when({ kind: 'timer' }, (s) => ({
      kind: 'timer',
      details: s.cron,
    })),
    Match.when({ kind: 'webhook' }, (s) => ({
      kind: 'webhook',
      details: `${s.method ?? 'POST'}${s.port ? `:${s.port}` : ''}`,
    })),
    Match.orElse(() => ({
      kind: 'unknown',
      details: undefined,
    })),
  );
};

/**
 * Pretty prints a trigger with ANSI colors.
 */
export const printTrigger = Effect.fn(function* (trigger: Trigger.Trigger) {
  const enabled = trigger.enabled ?? false;
  const statusColor = enabled ? Ansi.green : Ansi.blackBright;
  const statusText = enabled ? 'enabled' : 'disabled';

  const fnTarget = trigger.function && (yield* Database.Service.load(trigger.function));
  const fnName =
    fnTarget && Obj.instanceOf(Function.Function, fnTarget)
      ? (fnTarget.name ?? fnTarget.key ?? fnTarget.id)
      : (trigger.function?.dxn?.toString() ?? 'N/A');

  const primaryLine = [
    Doc.annotate(Doc.text(fnName), Ansi.combine(Ansi.bold, Ansi.cyan)),
    Doc.text(' '),
    Doc.annotate(Doc.text(`[${statusText}]`), statusColor),
  ];

  const idLine = [Doc.text('  Trigger: '), Doc.text(trigger.id)];

  const specInfo = getTriggerSpecInfo(trigger.spec);
  const kindLine = [Doc.text('  Kind: '), Doc.text(specInfo.kind)];
  if (specInfo.details) {
    kindLine.push(Doc.text(` (${specInfo.details})`));
  }

  const parts = [primaryLine, idLine, kindLine];

  if (trigger.inputNodeId) {
    const inputNodeLine = [Doc.text('  Input Node: '), Doc.text(trigger.inputNodeId)];
    parts.push(inputNodeLine);
  }

  if (trigger.input && Object.keys(trigger.input).length > 0) {
    const inputHeaderLine = [Doc.text('  Input:')];
    parts.push(inputHeaderLine);

    for (const [key, value] of Object.entries(trigger.input)) {
      const valueStr = typeof value === 'string' ? value : JSON.stringify(value);
      const inputLine = [
        Doc.text('    '),
        Doc.text(key),
        Doc.text(': '),
        Doc.annotate(Doc.text(valueStr), Ansi.blackBright),
      ];
      parts.push(inputLine);
    }
  }

  const lines = parts.map((part) => Doc.hcat(part));
  const doc = Doc.vsep(lines);
  return AnsiDoc.render(doc, { style: 'pretty' });
});
