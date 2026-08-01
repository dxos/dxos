//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import { FactStore, type RDF } from '@dxos/pipeline-rdf';

import { FACT_STORE_FIXTURE } from '../config';

export const factStoreFixtureExists = (): boolean => existsSync(FACT_STORE_FIXTURE);

/**
 * Serializes facts to disk. RDF facts are plain subject-predicate-object records, so a JSON array
 * round-trips losslessly through `FactStore.putFacts` — the store re-derives its triples on load.
 */
export const saveFacts = (facts: readonly RDF.Fact[], path: string = FACT_STORE_FIXTURE): void => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(facts, null, 2));
};

export const loadFacts = (path: string = FACT_STORE_FIXTURE): RDF.Fact[] =>
  JSON.parse(readFileSync(path, 'utf8')) as RDF.Fact[];

/** Lowercase-hyphenated entity slug, matching how the Brain skill normalizes names. */
export const slugify = (name: string): string =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** The set of entity slugs appearing as subject or object across the facts. */
export const factEntities = (facts: readonly RDF.Fact[]): Set<string> => {
  const entities = new Set<string>();
  for (const fact of facts) {
    for (const term of [fact.assertion.subject, fact.assertion.object]) {
      if (term && typeof term === 'object' && 'entity' in term && typeof term.entity === 'string') {
        entities.add(term.entity);
      }
    }
  }
  return entities;
};

/** An in-memory `FactStore` layer preloaded with the given facts — used to inject a fixture. */
export const factStoreLayer = (facts: readonly RDF.Fact[]): Layer.Layer<FactStore> =>
  Layer.effect(
    FactStore,
    Effect.gen(function* () {
      const store = FactStore.makeMemory();
      if (facts.length > 0) {
        yield* store.putFacts(facts).pipe(Effect.orDie);
      }
      return store;
    }),
  );

/** Loads the persisted fact store fixture into an in-memory `FactStore` layer. */
export const factStoreLayerFromFixture = (path: string = FACT_STORE_FIXTURE): Layer.Layer<FactStore> =>
  factStoreLayer(loadFacts(path));
