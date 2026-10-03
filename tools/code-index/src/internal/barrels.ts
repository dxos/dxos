//
// Copyright 2026 DXOS.org
//

import type { Quad } from '@rdfjs/types';
import * as Effect from 'effect/Effect';
import { DataFactory } from 'n3';

import * as Ontology from '../Ontology.ts';
import type * as Store from '../Store.ts';
import { uniqueModuleFiles } from '../worker/types/Bind.ts';

/** The facts a cross-file pass resolves names through: aliases, namespaces, `export *` and bare specifiers. */
export type Barrels = {
  readonly aliasOf: ReadonlyMap<string, readonly string[]>;
  readonly namespaceOf: ReadonlyMap<string, readonly string[]>;
  readonly reexports: ReadonlyMap<string, readonly string[]>;
  /** A module IRI and the one file it resolves to; a module resolving to several files is absent. */
  readonly moduleFile: ReadonlyMap<string, string>;
};

/** File graphs only: neither a derived graph nor a pass's previous run is a premise. */
export const asserted = (quads: readonly Quad[]): Quad[] =>
  quads.filter((quad) => Ontology.isFileGraph(quad.graph.value));

/** Reads one predicate's asserted quads. */
export const readAsserted = (store: Store.Api, predicate: { readonly value: string }) =>
  Effect.map(store.match(undefined, DataFactory.namedNode(predicate.value)), asserted);

/** Each subject's objects, in the order read. */
export const group = (quads: readonly Quad[]): Map<string, string[]> => {
  const grouped = new Map<string, string[]>();
  for (const quad of quads) {
    const objects = grouped.get(quad.subject.value);
    if (objects) {
      objects.push(quad.object.value);
    } else {
      grouped.set(quad.subject.value, [quad.object.value]);
    }
  }
  return grouped;
};

export const read = (store: Store.Api): Effect.Effect<Barrels, Store.StoreError> =>
  Effect.gen(function* () {
    const aliases = yield* readAsserted(store, Ontology.aliasOf);
    const namespaces = yield* readAsserted(store, Ontology.namespaceOf);
    const reexports = yield* readAsserted(store, Ontology.reexports);
    const modules = yield* readAsserted(store, Ontology.moduleFile);
    return {
      aliasOf: group(aliases),
      namespaceOf: group(namespaces),
      reexports: group(reexports),
      moduleFile: uniqueModuleFiles(modules.map((quad) => [quad.subject.value, quad.object.value] as const)),
    };
  });
