//
// Copyright 2026 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setFlagsFromString } from 'node:v8';
import { runInNewContext } from 'node:vm';

import { Filter, Obj, Query, Ref } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { SpaceId } from '@dxos/keys';

import { SqliteDatabase } from './database.ts';

// Run with: DX_RUN_MANUAL_TESTS=1 pnpm exec vitest run src/memory.report.test.ts
setFlagsFromString('--expose-gc');
const gc: () => void = runInNewContext('gc');

const settle = async () => {
  for (let round = 0; round < 6; round++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
    gc();
  }
};

const heapMb = () => process.memoryUsage().heapUsed / 2 ** 20;

const SIZES = [1_000, 10_000, 50_000];
const TYPES = [TestSchema.Person, TestSchema.Organization];

describe('Memory report (heap vs. space size)', { tags: ['manual'], timeout: 1_200_000 }, () => {
  it.effect('heap stays flat in space size; a full hydration is released', () =>
    Effect.gen(function* () {
      const rows: string[] = [];
      for (const size of SIZES) {
        const dir = mkdtempSync(join(tmpdir(), 'echo-sqlite-memory-'));
        const filename = join(dir, 'space.db');
        const spaceId = SpaceId.random();
        const layer = SqliteClient.layer({ filename });

        yield* Effect.scoped(
          Effect.gen(function* () {
            const db = yield* SqliteDatabase.open({ spaceId, types: TYPES });
            yield* Effect.promise(async () => {
              const org = db.add(Obj.make(TestSchema.Organization, { name: 'DXOS' }));
              for (let index = 0; index < size; index++) {
                db.add(
                  Obj.make(TestSchema.Person, { name: `Person ${index}`, age: index % 90, employer: Ref.make(org) }),
                );
              }
              await db.flush();
            });
          }),
        ).pipe(Effect.provide(layer));

        yield* Effect.scoped(
          Effect.gen(function* () {
            yield* Effect.promise(settle);
            const baseline = heapMb();
            const db = yield* SqliteDatabase.open({ spaceId, types: TYPES });
            yield* Effect.promise(async () => {
              await settle();
              const opened = heapMb();
              await db.query(Query.select(Filter.type(TestSchema.Person)).limit(20)).run();
              await settle();
              const paged = heapMb();
              const all = await db.query(Filter.type(TestSchema.Person)).run();
              const held = heapMb();
              const heldCount = db.diagnostics().resident;
              all.length = 0;
              await settle();
              const released = heapMb();
              rows.push(
                `| ${size.toLocaleString().padStart(6)} | ${(opened - baseline).toFixed(1).padStart(6)} MB | ${(
                  paged - baseline
                )
                  .toFixed(1)
                  .padStart(
                    6,
                  )} MB | ${(held - baseline).toFixed(1).padStart(7)} MB (${heldCount.toLocaleString()} resident) | ${(
                  released - baseline
                )
                  .toFixed(1)
                  .padStart(6)} MB (${db.diagnostics().resident} resident, ${db.diagnostics().tracked} tracked) |`,
              );
            });
          }),
        ).pipe(Effect.provide(layer));
        rmSync(dir, { recursive: true, force: true });
      }
      // eslint-disable-next-line no-console
      console.log(
        [
          '| objects | after open | after limit(20) | holding a full hydration | after releasing it |',
          '| ------: | ---------: | --------------: | -----------------------: | -----------------: |',
          ...rows,
        ].join('\n'),
      );
    }),
  );
});
