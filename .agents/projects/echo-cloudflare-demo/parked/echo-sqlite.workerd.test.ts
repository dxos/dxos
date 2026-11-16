//
// Copyright 2026 DXOS.org
//

import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';

import type { EchoSqliteObject, Summary } from './workerd-do.ts';

/**
 * Spike: does `@dxos/echo-sqlite` run in the Workers runtime on a Durable Object's own SQLite?
 *
 * This is the server half of the demo. It executes rather than merely bundles: miniflare gives the
 * object real `ctx.storage.sql`, `@effect/sql-sqlite-do` presents that as an effect `SqlClient`,
 * and `echo-sqlite` consumes only that interface — the same code the browser half runs over OPFS.
 *
 * SKIPPED for the harness reason in `load.workerd.test.ts`. It also needs the DO binding back in
 * `vite.config.ts`, which was removed while isolating that failure:
 *
 * ```ts
 * workerd: {
 *   main: 'src/testing/workerd-do.ts',
 *   // `useSQLite` is what gives the object `ctx.storage.sql`; without it the DO gets the
 *   // key-value backend and `@effect/sql-sqlite-do` has nothing to bind to.
 *   miniflare: { durableObjects: { ECHO_SQLITE: { className: 'EchoSqliteObject', useSQLite: true } } },
 * },
 * ```
 */

declare global {
  interface Env {
    ECHO_SQLITE: DurableObjectNamespace<EchoSqliteObject>;
  }
}

describe('echo-sqlite in a Durable Object', () => {
  it('builds a graph in DO SQLite and queries it back', async () => {
    const stub = env.ECHO_SQLITE.get(env.ECHO_SQLITE.idFromName('demo'));
    const summary: Summary = await stub.seedAndQuery();

    expect(summary.people).toEqual(['Alice']);
    // Ref traversal resolved inside the DO — a graph, not a table.
    expect(summary.employer).toEqual('Cloudflare');
    // FTS5 is available in workerd's SQLite too.
    expect(summary.textMatches).toEqual(1);
  });
});
