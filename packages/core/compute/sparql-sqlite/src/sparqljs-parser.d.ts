//
// Copyright 2026 DXOS.org
//

// The generated Jison parser inside sparqljs, imported on its own so the bundle leaves out the package entry's
// SPARQL generator and `rdf-data-factory` (see docs/SIZE.md). `@types/sparqljs` only types the package entry.
declare module 'sparqljs/lib/SparqlParser.js' {
  import {
    type BlankTerm,
    type IriTerm,
    type LiteralTerm,
    type QuadTerm,
    type SparqlQuery,
    type VariableTerm,
  } from 'sparqljs';

  /** The RDF/JS `DataFactory` subset the generated parser calls. */
  export interface ParserFactory {
    namedNode(value: string): IriTerm;
    blankNode(value: string): BlankTerm;
    literal(value: string, languageOrDatatype?: string | IriTerm): LiteralTerm;
    variable(value: string): VariableTerm;
    quad(subject: QuadTerm['subject'], predicate: QuadTerm['predicate'], object: QuadTerm['object']): QuadTerm;
  }

  /** Jison parser constructor; per-parse options are static fields read by the grammar actions. */
  export interface ParserConstructor {
    new (): { parse(text: string): SparqlQuery };
    base: string;
    prefixes: Record<string, string> | null;
    factory: ParserFactory;
    sparqlStar: boolean;
    pathOnly: boolean;
    skipValidation: boolean;
  }

  const generated: { Parser: ParserConstructor };
  export = generated;
}
