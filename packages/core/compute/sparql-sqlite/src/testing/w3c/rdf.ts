//
// Copyright 2026 DXOS.org
//

import { Parser } from 'n3';
import { readFileSync } from 'node:fs';
import { parse as parseOxigraph } from 'oxigraph';

import { type Quad, type Term, XSD } from '../../terms.ts';

/** The RDF/JS term fields the converters read (n3, Oxigraph and Comunica terms all have them). */
export type RdfjsTermLike = {
  termType: string;
  value: string;
  language?: string;
  datatype?: { value: string };
};

/** Converts an RDF/JS term into the engine's plain `Term` (xsd:string is left implicit). */
export const fromRdfjs = (term: RdfjsTermLike): Term => {
  switch (term.termType) {
    case 'NamedNode':
      return { termType: 'NamedNode', value: term.value };
    case 'BlankNode':
      return { termType: 'BlankNode', value: term.value };
    case 'Literal': {
      if (term.language) {
        return { termType: 'Literal', value: term.value, language: term.language };
      }
      const datatype = term.datatype?.value;
      return datatype && datatype !== `${XSD}string` && !datatype.endsWith('#langString')
        ? { termType: 'Literal', value: term.value, datatype }
        : { termType: 'Literal', value: term.value };
    }
    default:
      throw new Error(`unexpected term type ${term.termType}`);
  }
};

const formatOf = (path: string): string => {
  if (path.endsWith('.rdf')) {
    return 'application/rdf+xml';
  }
  if (path.endsWith('.nt')) {
    return 'application/n-triples';
  }
  if (path.endsWith('.trig')) {
    return 'application/trig';
  }
  return 'text/turtle';
};

/**
 * Parses an RDF file into triples (graph names dropped unless `graph` is given).
 * Turtle-family files go through n3; RDF/XML, which n3 cannot read, through Oxigraph's parser.
 * Each call yields fresh blank node labels, so two files never share a blank node.
 */
export const parseRdfFile = (path: string, baseIri: string, graph?: Term): Quad[] => {
  const text = readFileSync(path, 'utf8');
  const format = formatOf(path);
  const terms =
    format === 'application/rdf+xml'
      ? parseOxigraph(text, { format, base_iri: baseIri })
      : new Parser({ baseIRI: baseIri, format }).parse(text);
  return terms.map((quad) => ({
    s: fromRdfjs(quad.subject),
    p: fromRdfjs(quad.predicate),
    o: fromRdfjs(quad.object),
    ...(graph ? { g: graph } : {}),
  }));
};
