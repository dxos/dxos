//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { DataFactory } from 'n3';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { EffectEx } from '@dxos/effect';

import { indexFixture, writeFixture } from './mcp/fixture.ts';
import * as Ontology from './Ontology.ts';
import * as Store from './Store.ts';
import * as Summary from './Summary.ts';

describe('Summary', () => {
  let root: string;
  let dir: string;

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'code-index-summary-'));
    dir = join(root, 'store');
    await writeFixture(root);
    await indexFixture(root, dir);
  }, 60_000);

  afterAll(async () => {
    await rm(root, { recursive: true, force: true });
  });

  const withStore = <A>(body: (store: Store.Api) => Effect.Effect<A, Store.StoreError>) =>
    EffectEx.runPromise(Effect.scoped(Effect.provide(Effect.flatMap(Store.Store, body), Store.layer(dir))));

  test('an indexing pass records counts that match a live count', async () => {
    const [recorded, live] = await withStore((store) => Effect.all([Summary.read(store), Summary.compute(store)]));
    expect(recorded).toEqual(live);
    expect(recorded?.files).toBe(5);
    expect(recorded?.vocabulary).toContainEqual({ term: 'File', kind: 'class', count: 5 });
  });

  test('a write since the pass makes the recorded summary stale until it is refreshed', async () => {
    const quad = DataFactory.quad(
      Ontology.fileIri('src/a.ts'),
      Ontology.iri('note'),
      DataFactory.literal('x'),
      DataFactory.namedNode(`${Ontology.FILE_GRAPH_PREFIX}extra`),
    );
    const [stale, refreshed, current] = await withStore((store) =>
      Effect.gen(function* () {
        yield* store.putQuads([quad]);
        const stale = yield* Summary.read(store);
        const refreshed = yield* Summary.refresh(store);
        return [stale, refreshed, yield* Summary.read(store)] as const;
      }),
    );
    expect(stale).toBeUndefined();
    expect(refreshed.vocabulary).toContainEqual({ term: 'note', kind: 'property', count: 1 });
    expect(current).toEqual(refreshed);
  });
});
