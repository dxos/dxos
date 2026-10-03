//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { EffectEx } from '@dxos/effect';

import * as Ontology from './Ontology.ts';
import * as Reasoner from './Reasoner.ts';
import * as Store from './Store.ts';

/**
 * The rule files as shipped, run against a real store — a paraphrase of a rule in a test proves the
 * paraphrase. `60-canonical.n3` is the one with a property worth guarding: exactly one canonical
 * name per symbol, which its scoped negation is what secures.
 */

const CANONICAL = join(Reasoner.BUNDLED_DIR, '60-canonical.n3');

const symbol = (path: string, name: string, extra: Partial<Ontology.SymbolNode> = {}): Ontology.SymbolNode => ({
  '@id': Ontology.symbolIri(path, name).value,
  '@type': 'Symbol',
  name,
  'kind': 'variable',
  'exported': true,
  'line': 1,
  'extends': [],
  'constructedBy': [],
  'pipedThrough': [],
  'derivedFrom': [],
  'argument': [],
  'apiDependsOn': [],
  'implDependsOn': [],
  'aliasOf': [],
  ...extra,
});

const document = (path: string, declares: readonly Ontology.SymbolNode[]): Ontology.FileDocument => ({
  '@context': Ontology.CONTEXT,
  '@id': Ontology.fileIri(path).value,
  '@type': 'File',
  path,
  'language': 'typescript',
  'size': 1,
  'mtime': 1,
  'hash': `hash-${path}`,
  'inPackage': Ontology.packageIri('@dxos/test').value,
  'imports': [],
  'importsType': [],
  'importsModule': [],
  'reexports': [],
  declares,
});

describe('bundled rules', () => {
  let dir: string;

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'code-index-rules-'));
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  const canonicalNames = async (documents: readonly Ontology.FileDocument[]): Promise<string[]> =>
    EffectEx.runPromise(
      Effect.gen(function* () {
        const store = yield* Store.Store;
        for (const each of documents) {
          yield* store.putDocument(each);
        }
        const [reasoner] = yield* Reasoner.loadFile(CANONICAL);
        const derived = yield* store.reason(reasoner.name, reasoner.rules);
        return derived
          .filter((quad) => quad.predicate.value === Ontology.canonicalName.value)
          .map((quad) => `${quad.subject.value} = ${quad.object.value}`)
          .sort();
      }).pipe(Effect.provide(Store.layer(join(dir, `store-${documents.length}-${Math.random()}`))), Effect.scoped),
    );

  test('an identifier imported directly is its own canonical name', async () => {
    const names = await canonicalNames([document('src/plain.ts', [symbol('src/plain.ts', 'helper')])]);
    expect(names).toEqual([`${Ontology.symbolIri('src/plain.ts', 'helper').value} = helper`]);
  });

  test('a namespaced module qualifies its identifiers, and only that', async () => {
    const names = await canonicalNames([
      document('src/Ontology.ts', [symbol('src/Ontology.ts', 'symbolIri'), symbol('src/Ontology.ts', 'fileIri')]),
      document('src/index.ts', [
        symbol('src/index.ts', 'Ontology', {
          kind: 'namespace',
          namespaceOf: [Ontology.fileIri('src/Ontology.ts').value],
        }),
      ]),
    ]);

    // The qualified form, and no bare `symbolIri` beside it: two canonical names would leave every
    // consumer to guess which one an importer actually writes.
    expect(names).toEqual([
      `${Ontology.symbolIri('src/Ontology.ts', 'fileIri').value} = Ontology.fileIri`,
      `${Ontology.symbolIri('src/Ontology.ts', 'symbolIri').value} = Ontology.symbolIri`,
      // The namespace is imported by name from the barrel, so it is its own canonical name.
      `${Ontology.symbolIri('src/index.ts', 'Ontology').value} = Ontology`,
    ]);
  });

  test('an unexported declaration has no canonical name', async () => {
    // Nothing outside can name it, so there is no external name to state.
    const names = await canonicalNames([
      document('src/private.ts', [symbol('src/private.ts', 'internal', { exported: false })]),
    ]);
    expect(names).toEqual([]);
  });
});
