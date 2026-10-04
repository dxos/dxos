//
// Copyright 2026 DXOS.org
//
// @import-as-namespace
//

import type { Quad } from '@rdfjs/types';
import * as Effect from 'effect/Effect';
import { DataFactory } from 'n3';

import * as Barrels from './internal/barrels.ts';
import * as Ontology from './Ontology.ts';
import type * as Store from './Store.ts';
import { type SymbolFacts, declarations, isDeclaration } from './worker/types/Bind.ts';

/**
 * The cross-file reference pass: links every reference an importer wrote — `file:<barrel>#X` through
 * `export *`, a named re-export or a namespace, `module:<specifier>#X.y` under a bare specifier — to
 * the declaration it denotes, as `deus:resolvesTo` in its pass graph. The parser's dependency edges
 * stay as written; `?user deus:implDependsOn|deus:apiDependsOn ?r . ?r deus:resolvesTo? <D>` finds
 * every user of `D`.
 */

export const NAME = 'resolve-refs';

const DEUS = `PREFIX deus: <${Ontology.PREFIX}>`;

/**
 * Every IRI a symbol depends on. Only the parser states these two predicates (no rule concludes
 * them), so the union over all graphs is the file graphs' union.
 */
const REFERENCES = `${DEUS}
  SELECT DISTINCT ?target WHERE { { ?s deus:implDependsOn ?target } UNION { ?s deus:apiDependsOn ?target } }`;

/** The IRIs a reference may name in-repo; anything else is external and resolves to nothing. */
const isAddressable = (iri: string): boolean =>
  iri.startsWith(Ontology.FILE_BASE) || iri.startsWith(Ontology.MODULE_BASE);

export const derive = (store: Store.Api): Effect.Effect<Quad[], Store.StoreError> =>
  Effect.gen(function* () {
    const kinds = yield* Barrels.readAsserted(store, Ontology.kind);
    const { aliasOf, namespaceOf, reexports, moduleFile } = yield* Barrels.read(store);
    // Every kind per IRI, since a declaration merge (`class X` + `namespace X`) asserts two.
    const kindsOf = new Map<string, string[]>();
    for (const quad of kinds) {
      const known = kindsOf.get(quad.subject.value);
      if (known) {
        known.push(quad.object.value);
      } else {
        kindsOf.set(quad.subject.value, [quad.object.value]);
      }
    }

    const symbol = (iri: string): SymbolFacts | undefined => {
      const symbolKinds = kindsOf.get(iri);
      const aliases = aliasOf.get(iri);
      const namespaces = namespaceOf.get(iri);
      return symbolKinds === undefined && aliases === undefined && namespaces === undefined
        ? undefined
        : { term: undefined, aliasOf: aliases ?? [], namespaceOf: namespaces ?? [], kinds: symbolKinds };
    };
    const { declarationOf } = declarations({
      symbol,
      moduleFile: (iri) => moduleFile.get(iri),
      reexports: (file) => reexports.get(file) ?? [],
    });

    // A re-export alias resolves even when nothing references it, so its origin is always known.
    const referenced = (yield* store.select(REFERENCES)).map((row) => row.target);
    const aliases = [...kindsOf].filter(([, symbolKinds]) => symbolKinds.includes('reexport')).map(([iri]) => iri);

    const quads: Quad[] = [];
    for (const reference of new Set([...referenced, ...aliases])) {
      if (reference === undefined || !isAddressable(reference)) {
        continue;
      }
      const facts = symbol(reference);
      if (facts && isDeclaration(facts)) {
        continue;
      }
      const declaration = declarationOf(reference);
      if (declaration !== undefined && declaration !== reference) {
        quads.push(
          DataFactory.quad(DataFactory.namedNode(reference), Ontology.resolvesTo, DataFactory.namedNode(declaration)),
        );
      }
    }
    return quads;
  });
