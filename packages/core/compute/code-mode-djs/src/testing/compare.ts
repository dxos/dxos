//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Obj } from '@dxos/echo';
import { type TestContextService } from '@dxos/effect/testing';

import * as DjsSandbox from '../DjsSandbox.ts';
import {
  DjsEffectDialect,
  IN_PROCESS,
  TestLayer,
  dumpDatabase,
  normalizeIds,
  runEvaluate,
  seedTasks,
  testEngine,
} from './fixtures.ts';

/**
 * A program, or a conversation's programs in order, run through both sandboxes.
 *
 * `{{id:N}}`, `{{uri:N}}` and `{{legacy:N}}` name the N-th seeded task (`{{project}}` the project) by
 * id, URI or legacy ECHO DXN, filled in per database since each is seeded afresh.
 */
export type CompatCase = {
  readonly name: string;
  readonly programs: readonly string[];
  /**
   * `same` (default): the djs output and database equal the in-process ones. `ok`: djs succeeds,
   * for a sequence that reads variables an earlier program bound, which in-process cannot.
   * `fails`: both fail, with messages that may be worded differently (a syntax error is the engine's).
   */
  readonly expect?: 'same' | 'ok' | 'fails';
  /** Where the program came from: a test, a doc, or a recorded conversation. */
  readonly source?: string;
};

export type CaseRun = {
  readonly results: readonly { readonly ok: boolean; readonly output: string }[];
  readonly database: string;
};

const fill = (program: string, seeded: Effect.Success<ReturnType<typeof seedTasks>>): string =>
  program.replace(
    /\{\{(id|uri|legacy):(\d+)\}\}|\{\{project\}\}/g,
    (match, kind: string | undefined, index: string | undefined) => {
      if (match === '{{project}}') {
        return seeded.project.id;
      }
      const task = seeded.tasks[Number(index)];
      const uri = Obj.getURI(task);
      switch (kind) {
        case 'id':
          return task.id;
        case 'uri':
          return uri;
        default:
          return uri.replace(
            /^echo:\/\/([^/]*)\/(.+)$/,
            (_, space: string, id: string) => `dxn:echo:${space || '@'}:${id}`,
          );
      }
    },
  );

/**
 * Runs a case's programs in order against a freshly seeded database. In-process, each program is a
 * fresh evaluation, as it always is there; in djs, they share one session.
 */
export const runCase = (
  compat: CompatCase,
  sandbox: 'in-process' | 'djs',
): Effect.Effect<CaseRun, never, TestContextService> =>
  Effect.gen(function* () {
    const seeded = yield* seedTasks();
    const djs = sandbox === 'djs' ? DjsSandbox.make({ engine: yield* Effect.promise(testEngine) }) : undefined;
    const target = djs ? { dialect: DjsEffectDialect, sandbox: djs } : IN_PROCESS;
    const results: { ok: boolean; output: string }[] = [];
    for (const program of compat.programs) {
      const { ok, output } = yield* runEvaluate(fill(program, seeded), target);
      results.push({ ok, output: normalizeIds(output) });
    }
    djs?.dispose();
    return { results, database: yield* dumpDatabase() };
  }).pipe(Effect.provide(TestLayer), Effect.orDie);
