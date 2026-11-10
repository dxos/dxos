//
// Copyright 2026 DXOS.org
//

import * as SqliteDoClient from '@effect/sql-sqlite-do';
import { DurableObject } from 'cloudflare:workers';
import * as Effect from 'effect/Effect';

import { Filter, Obj, Ref } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { SpaceId } from '@dxos/keys';

import { SqliteDatabase } from '../database.ts';

const TYPES = [TestSchema.Person, TestSchema.Organization];

/** Fixed so a second RPC call reaches the space the first one wrote. */
const SPACE_ID = SpaceId.random();

export type Summary = {
  readonly people: readonly string[];
  readonly employer: string | undefined;
  readonly textMatches: number;
};

/**
 * An ECHO database living in a Durable Object's own SQLite, which is the server half of the demo:
 * `@effect/sql-sqlite-do` presents `ctx.storage.sql` as an effect `SqlClient`, and `echo-sqlite`
 * consumes only that interface — so the same database code runs here and in the browser.
 */
export class EchoSqliteObject extends DurableObject {
  /** Builds a small graph, then reads it back through the query compiler. */
  async seedAndQuery(): Promise<Summary> {
    return Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const db = yield* SqliteDatabase.open({ spaceId: SPACE_ID, types: TYPES });

          return yield* Effect.promise(async () => {
            const org = db.add(Obj.make(TestSchema.Organization, { name: 'Cloudflare' }));
            db.add(
              Obj.make(TestSchema.Person, {
                name: 'Alice',
                username: 'alice',
                email: 'alice@example.com',
                tasks: [],
                employer: Ref.make(org),
              }),
            );
            await db.flush();

            const people = await db.query(Filter.type(TestSchema.Person)).run();
            const employer = people[0]?.employer === undefined ? undefined : await people[0].employer.load();
            const textMatches = await db.query(Filter.text('alice@example')).run();

            return {
              // `name` is optional on the stored shape, so narrow rather than widen `Summary`.
              people: people.map((person) => person.name).filter((name): name is string => name !== undefined),
              employer: employer?.name,
              textMatches: textMatches.length,
            };
          });
        }),
      ).pipe(Effect.provide(SqliteDoClient.SqliteClient.layer({ storage: this.ctx.storage })), Effect.orDie),
    );
  }
}

export default {
  fetch: () => new Response('echo-sqlite workerd spike'),
};
