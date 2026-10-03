//
// Copyright 2026 DXOS.org
//
// @import-as-namespace
//

import type { Quad } from '@rdfjs/types';
import * as Effect from 'effect/Effect';
import { DataFactory } from 'n3';

import * as Ontology from './Ontology.ts';
import type * as Store from './Store.ts';
import { type SymbolFacts, binder, hasDeferred } from './worker/types/Bind.ts';
import * as TypeRdf from './worker/types/Rdf.ts';
import * as Term from './worker/types/Term.ts';

/**
 * The cross-file type pass (`design/TYPES.md`, "Binding"): reads every symbol's term from the file
 * graphs, binds the `typeof`/`returnOf` names it holds to the declaring symbols' terms, and asserts
 * the bound type as a further `deus:hasType` in its pass graph — a premise of every rule file, so
 * `15-types` sees bound layers.
 */

export const NAME = 'bind-types';

/** File graphs only: neither a derived graph nor this pass's previous run is a premise. */
const asserted = (quads: readonly Quad[]) => quads.filter((quad) => Ontology.isFileGraph(quad.graph.value));

export const derive = (store: Store.Api): Effect.Effect<Quad[], Store.StoreError> =>
  Effect.gen(function* () {
    const read = (predicate: { value: string }) =>
      Effect.map(store.match(undefined, DataFactory.namedNode(predicate.value)), asserted);
    const terms = yield* read(Ontology.typeTerm);
    const aliases = yield* read(Ontology.aliasOf);
    const namespaces = yield* read(Ontology.namespaceOf);
    const reexports = yield* read(Ontology.reexports);
    const modules = yield* read(Ontology.moduleFile);

    const group = (quads: readonly Quad[]) => {
      const grouped = new Map<string, string[]>();
      for (const quad of quads) {
        grouped.set(quad.subject.value, [...(grouped.get(quad.subject.value) ?? []), quad.object.value]);
      }
      return grouped;
    };
    const aliasOf = group(aliases);
    const namespaceOf = group(namespaces);
    const reexported = group(reexports);
    const moduleFile = new Map(modules.map((quad) => [quad.subject.value, quad.object.value]));
    const termOf = new Map<string, Term.Type>();
    for (const quad of terms) {
      termOf.set(quad.subject.value, Term.fromJson(JSON.parse(quad.object.value)));
    }
    const symbols = new Set([...termOf.keys(), ...aliasOf.keys(), ...namespaceOf.keys()]);
    const { bind } = binder({
      symbol: (iri): SymbolFacts | undefined =>
        symbols.has(iri)
          ? { term: termOf.get(iri), aliasOf: aliasOf.get(iri) ?? [], namespaceOf: namespaceOf.get(iri) ?? [] }
          : undefined,
      moduleFile: (iri) => moduleFile.get(iri),
      reexports: (file) => reexported.get(file) ?? [],
    });

    const types = TypeRdf.collector();
    const quads: Quad[] = [];
    for (const [symbol, term] of termOf) {
      if (!hasDeferred(term)) {
        continue;
      }
      const bound = bind(term);
      if (Term.text(bound) === Term.text(term)) {
        continue;
      }
      const iri = types.add(bound);
      if (iri) {
        quads.push(DataFactory.quad(DataFactory.namedNode(symbol), Ontology.hasType, DataFactory.namedNode(iri)));
      }
    }
    return [...quads, ...TypeRdf.toQuads(types.nodes())];
  });
