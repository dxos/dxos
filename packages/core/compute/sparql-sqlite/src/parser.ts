//
// Copyright 2026 DXOS.org
//

import { type IriTerm, type SparqlQuery, type Term as SparqlTerm } from 'sparqljs';
import generated, { type ParserFactory } from 'sparqljs/lib/SparqlParser.js';

import { RDF, XSD } from './terms.ts';

type RdfTerm = Parameters<IriTerm['equals']>[0];

/** RDF/JS term equality, shared by every term the factory makes. */
function equals(this: SparqlTerm, other: RdfTerm): boolean {
  if (!other || other.termType !== this.termType || other.value !== this.value) {
    return false;
  }
  if (this.termType === 'Literal' && other.termType === 'Literal') {
    return this.language === other.language && this.datatype.equals(other.datatype);
  }
  if (this.termType === 'Quad' && other.termType === 'Quad') {
    return (
      this.subject.equals(other.subject) &&
      this.predicate.equals(other.predicate) &&
      this.object.equals(other.object) &&
      this.graph.equals(other.graph)
    );
  }
  return true;
}

const namedNode = (value: string): IriTerm => ({ termType: 'NamedNode', value, equals });
const LANG_STRING = namedNode(`${RDF}langString`);
const XSD_STRING = namedNode(`${XSD}string`);

/** Same terms as `rdf-data-factory`, which the sparqljs entry would otherwise pull in. */
const factory: ParserFactory = {
  namedNode,
  blankNode: (value) => ({ termType: 'BlankNode', value, equals }),
  variable: (value) => ({ termType: 'Variable', value, equals }),
  literal: (value, languageOrDatatype) =>
    typeof languageOrDatatype === 'string'
      ? { termType: 'Literal', value, language: languageOrDatatype, datatype: LANG_STRING, equals }
      : { termType: 'Literal', value, language: '', datatype: languageOrDatatype ?? XSD_STRING, equals },
  quad: (subject, predicate, object) => ({
    termType: 'Quad',
    value: '',
    subject,
    predicate,
    object,
    graph: { termType: 'DefaultGraph', value: '', equals },
    equals,
  }),
};

const { Parser } = generated;
const parser = new Parser();

/** Parses SPARQL 1.1 query or update text into the sparqljs AST (`new Parser({ skipUngroupedVariableCheck: true })`). */
export const parseSparql = (text: string): SparqlQuery => {
  // The grammar actions read these statics and consume `prefixes`, so they are reset on every parse.
  Parser.base = '';
  Parser.prefixes = {};
  Parser.factory = factory;
  Parser.sparqlStar = false;
  Parser.pathOnly = false;
  Parser.skipValidation = true;
  return parser.parse(text);
};
