//
// Copyright 2026 DXOS.org
//
// @import-as-namespace
//

import type { Quad } from '@rdfjs/types';
import * as Effect from 'effect/Effect';
import { DataFactory } from 'n3';

import * as Barrels from './internal/barrels.ts';
import * as Cooperative from './internal/cooperative.ts';
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

export const derive = (store: Store.Api): Effect.Effect<Quad[], Store.StoreError> =>
  Effect.gen(function* () {
    const terms = yield* Barrels.readAsserted(store, Ontology.typeTerm);
    const { aliasOf, namespaceOf, reexports, moduleFile } = yield* Barrels.read(store);
    const termOf = new Map<string, Term.Type>();
    yield* Cooperative.forEach(terms, (quad) => {
      termOf.set(quad.subject.value, Term.fromJson(JSON.parse(quad.object.value)));
    });
    const symbols = new Set([...termOf.keys(), ...aliasOf.keys(), ...namespaceOf.keys()]);
    const { bind } = binder({
      symbol: (iri): SymbolFacts | undefined =>
        symbols.has(iri)
          ? { term: termOf.get(iri), aliasOf: aliasOf.get(iri) ?? [], namespaceOf: namespaceOf.get(iri) ?? [] }
          : undefined,
      moduleFile: (iri) => moduleFile.get(iri),
      reexports: (file) => reexports.get(file) ?? [],
    });

    const types = TypeRdf.collector();
    const quads: Quad[] = [];
    yield* Cooperative.forEach(termOf, ([symbol, term]) => {
      if (!hasDeferred(term)) {
        return;
      }
      const bound = bind(term);
      if (Term.text(bound) === Term.text(term)) {
        return;
      }
      const iri = types.add(bound);
      if (iri) {
        quads.push(DataFactory.quad(DataFactory.namedNode(symbol), Ontology.hasType, DataFactory.namedNode(iri)));
      }
    });
    return [...quads, ...TypeRdf.toQuads(types.nodes())];
  });
