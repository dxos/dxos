//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Filter, Obj, Query } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { SpaceId } from '@dxos/keys';

import { SqliteDatabase } from '../database.ts';
import { compileQuery } from '../sql/compile.ts';

/**
 * Risk 10, first half: does `@dxos/echo-sqlite` load and run in the Workers runtime at all?
 *
 * No Durable Object here, so there is no `SqlClient` and nothing can be stored — this asserts the
 * module graph evaluates under workerd and the query compiler produces SQL there. The storage half
 * needs `ctx.storage.sql`, which only exists inside a DO.
 *
 * PARKED — the workerd project is commented out in `vite.config.ts`, so this file is collected by
 * nothing (the node project excludes `*.workerd.test.ts`). Re-enable `workerd: true` to run it.
 *
 * The workerd project fails for this package before any module loads —
 * `TypeError: Cannot read properties of undefined (reading 'config')` at the first `describe`, with
 * `import 0ms`. Not this package's code: a test importing only `vitest` fails the same way, while
 * `plugin-markdown`'s workerd test passes on the same machine. Ruled out: the wa-sqlite alias (the
 * browser suite passes without it), the `browser` project coexisting, and a missing
 * `@cloudflare/vitest-pool-workers` — hoisted at the repo root, where `vite.base.config.ts` imports
 * it from, and declaring it plus `@cloudflare/workers-types` directly (as `plugin-host-cloudflare`
 * does) changed nothing. Remaining lead: `plugin-markdown` sets `jsx: 'react'`, this package no `jsx`.
 * Not on the demo's critical path — the browser half is what the demo runs on, and the DO only has
 * to persist exported bytes. See TASKS.md, risk 10.
 */

describe('echo-sqlite in workerd', () => {
  test('the module graph evaluates', ({ expect }) => {
    expect(typeof SqliteDatabase.open).toEqual('function');
    expect(typeof SqliteDatabase.layer).toEqual('function');
  });

  test('the query compiler produces SQL', ({ expect }) => {
    const query = Query.select(Filter.type(TestSchema.Person));
    const compiled = compileQuery(query.ast, { spaceId: SpaceId.random() });
    expect(compiled.sql).toContain('echo_entities');
  });

  test('objects can be constructed', ({ expect }) => {
    const org = Obj.make(TestSchema.Organization, { name: 'Cloudflare' });
    expect(org.name).toEqual('Cloudflare');
  });
});
