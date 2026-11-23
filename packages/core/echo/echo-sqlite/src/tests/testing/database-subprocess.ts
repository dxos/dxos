//
// Copyright 2026 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import * as Scope from 'effect/Scope';

import { Filter, Obj } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import * as EffectEx from '@dxos/effect/EffectEx';
import { SpaceId } from '@dxos/keys';

import { SqliteDatabase } from '../../database.ts';
import { type OtherProcessCommand, RESULT } from './database-subprocess-protocol.ts';

/**
 * A second process for the multi-process tests (F-8): opens a space's database on a file and runs
 * commands against it, printing one JSON line of results. Run with `vite-node`, so it loads the same
 * sources the tests do.
 */
const [path, spaceId, json] = process.argv.slice(2);
if (!path || !spaceId || !json || !SpaceId.isValid(spaceId)) {
  throw new Error('usage: database-subprocess <path> <spaceId> <commands json>');
}
const commands: OtherProcessCommand[] = JSON.parse(json);

const runtime = ManagedRuntime.make(SqliteClient.layer({ filename: path }));
const scope = await EffectEx.runPromise(Scope.make());
const db = await runtime.runPromise(
  SqliteDatabase.open({ spaceId, types: [TestSchema.Person] }).pipe(Effect.provideService(Scope.Scope, scope)),
);
const results: unknown[] = [];
for (const command of commands) {
  switch (command.op) {
    case 'add': {
      // Flushed one at a time, so this process commits as often as possible while the other one does.
      for (const name of command.names) {
        results.push(db.add(Obj.make(TestSchema.Person, { name })).id);
        await db.flush();
      }
      break;
    }
    case 'edit': {
      const [person] = await db.query(Filter.id(command.id)).run();
      Obj.update(person, (person) => {
        person.name = command.name;
      });
      await db.flush();
      break;
    }
    case 'read': {
      const [person] = await db.query(Filter.id(command.id)).run();
      results.push(Obj.isObject(person) ? Obj.toJSON(person) : null);
      break;
    }
  }
}
await db.close();
await EffectEx.runPromise(Scope.close(scope, Exit.void));
await runtime.dispose();
console.log(`${RESULT}${JSON.stringify(results)}`);
