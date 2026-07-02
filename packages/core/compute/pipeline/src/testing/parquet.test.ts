//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';
import { parquetWriteFile } from 'hyparquet-writer';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, test } from 'vitest';

import { EffectEx } from '@dxos/effect';

import { ParquetReadError, type ParquetRow, parquetSource } from './parquet';

// git clone https://huggingface.co/datasets/corbt/enron-emails

const collect = (files: readonly string[]): Promise<readonly ParquetRow[]> =>
  EffectEx.runPromise(
    parquetSource(files).pipe(
      Stream.runCollect,
      Effect.map((chunk) => [...chunk]),
    ),
  );

describe('parquetSource', () => {
  let dir: string;
  let fileA: string;
  let fileB: string;

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'dxos-pipeline-parquet-'));
    fileA = join(dir, 'a.parquet');
    fileB = join(dir, 'b.parquet');
    // rowGroupSize forces multiple row groups in fileA so the lazy per-group path is exercised.
    parquetWriteFile({
      filename: fileA,
      columnData: [
        { name: 'id', data: [1, 2, 3, 4], type: 'INT32' },
        { name: 'name', data: ['a', 'b', 'c', 'd'], type: 'STRING' },
      ],
      rowGroupSize: 2,
    });
    parquetWriteFile({
      filename: fileB,
      columnData: [
        { name: 'id', data: [5], type: 'INT32' },
        { name: 'name', data: ['e'], type: 'STRING' },
      ],
    });
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  test('streams rows across files in order, row group by row group', async ({ expect }) => {
    const rows = await collect([fileA, fileB]);
    expect(rows.map((row) => row.id)).toEqual([1, 2, 3, 4, 5]);
    expect(rows.map((row) => row.name)).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  test('fails with ParquetReadError for a missing file', async ({ expect }) => {
    const result = await EffectEx.runPromise(
      parquetSource([join(dir, 'missing.parquet')]).pipe(Stream.runCollect, Effect.either),
    );
    expect(result._tag).toBe('Left');
    if (result._tag === 'Left') {
      expect(result.left).toBeInstanceOf(ParquetReadError);
    }
  });
});
