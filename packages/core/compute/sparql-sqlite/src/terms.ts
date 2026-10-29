//
// Copyright 2026 DXOS.org
//

/** RDF term; plain data so rows serialize as JSON (literal datatype is omitted for xsd:string). */
export type Term =
  | { termType: 'NamedNode'; value: string }
  | { termType: 'BlankNode'; value: string }
  | { termType: 'Literal'; value: string; datatype?: string; language?: string };

/** A triple in the default graph, or a quad when `g` is set. */
export type Quad = { s: Term; p: Term; o: Term; g?: Term };

/** One SPARQL solution: variable name -> bound term (absent or undefined when unbound). */
export type Row = Record<string, Term | undefined>;

export const XSD = 'http://www.w3.org/2001/XMLSchema#';
export const RDF = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';

/** Creates an IRI term. */
export const iri = (value: string): Term => ({ termType: 'NamedNode', value });

/** Creates a literal term; xsd:string is normalized to a plain literal. */
export const lit = (value: string, datatype?: string, language?: string): Term => ({
  termType: 'Literal',
  value,
  ...(datatype && datatype !== `${XSD}string` ? { datatype } : {}),
  ...(language ? { language } : {}),
});
