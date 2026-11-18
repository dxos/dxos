//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as RdfJs from '@rdfjs/types';

//
// RDF/JS terms and quads (https://rdf.js.org/data-model-spec/), so the memory core builds and compares RDF without a
// parser library: n3 pulls in `readable-stream`, which does not load under workerd's `nodejs_compat`.
//

export type Term = RdfJs.Term;
export type NamedNode<Iri extends string = string> = RdfJs.NamedNode<Iri>;
export type BlankNode = RdfJs.BlankNode;
export type Literal = RdfJs.Literal;
export type Variable = RdfJs.Variable;
export type DefaultGraph = RdfJs.DefaultGraph;
export type Quad = RdfJs.Quad;
export type QuadSubject = RdfJs.Quad_Subject;
export type QuadPredicate = RdfJs.Quad_Predicate;
export type QuadObject = RdfJs.Quad_Object;
export type QuadGraph = RdfJs.Quad_Graph;

export const XSD_STRING = 'http://www.w3.org/2001/XMLSchema#string';
export const RDF_LANG_STRING = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#langString';
export const RDF_DIR_LANG_STRING = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#dirLangString';
export const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';

class NamedNodeTerm<Iri extends string = string> implements RdfJs.NamedNode<Iri> {
  readonly termType = 'NamedNode';
  constructor(readonly value: Iri) {}
  equals(other: RdfJs.Term | null | undefined): boolean {
    return !!other && other.termType === this.termType && other.value === this.value;
  }
}

class BlankNodeTerm implements RdfJs.BlankNode {
  readonly termType = 'BlankNode';
  constructor(readonly value: string) {}
  equals(other: RdfJs.Term | null | undefined): boolean {
    return !!other && other.termType === this.termType && other.value === this.value;
  }
}

class LiteralTerm implements RdfJs.Literal {
  readonly termType = 'Literal';
  constructor(
    readonly value: string,
    readonly language: string,
    readonly datatype: RdfJs.NamedNode,
    readonly direction: '' | 'ltr' | 'rtl' = '',
  ) {}
  equals(other: RdfJs.Term | null | undefined): boolean {
    return (
      !!other &&
      other.termType === this.termType &&
      other.value === this.value &&
      other.language === this.language &&
      (other.direction ?? '') === this.direction &&
      other.datatype.equals(this.datatype)
    );
  }
}

class VariableTerm implements RdfJs.Variable {
  readonly termType = 'Variable';
  constructor(readonly value: string) {}
  equals(other: RdfJs.Term | null | undefined): boolean {
    return !!other && other.termType === this.termType && other.value === this.value;
  }
}

class DefaultGraphTerm implements RdfJs.DefaultGraph {
  readonly termType = 'DefaultGraph';
  readonly value = '';
  equals(other: RdfJs.Term | null | undefined): boolean {
    return !!other && other.termType === this.termType;
  }
}

class QuadTerm implements RdfJs.Quad {
  readonly termType = 'Quad';
  readonly value = '';
  constructor(
    readonly subject: RdfJs.Quad_Subject,
    readonly predicate: RdfJs.Quad_Predicate,
    readonly object: RdfJs.Quad_Object,
    readonly graph: RdfJs.Quad_Graph,
  ) {}
  equals(other: RdfJs.Term | null | undefined): boolean {
    return (
      !!other &&
      other.termType === this.termType &&
      this.subject.equals(other.subject) &&
      this.predicate.equals(other.predicate) &&
      this.object.equals(other.object) &&
      this.graph.equals(other.graph)
    );
  }
}

const DEFAULT_GRAPH = new DefaultGraphTerm();
const STRING_DATATYPE = new NamedNodeTerm(XSD_STRING);
const LANG_STRING_DATATYPE = new NamedNodeTerm(RDF_LANG_STRING);
const DIR_LANG_STRING_DATATYPE = new NamedNodeTerm(RDF_DIR_LANG_STRING);

/** A named node for an IRI. */
export const namedNode = <Iri extends string = string>(value: Iri): RdfJs.NamedNode<Iri> => new NamedNodeTerm(value);

let nextBlankNode = 0;

/** A blank node; without a label, one unique within this process. */
export const blankNode = (value?: string): RdfJs.BlankNode => new BlankNodeTerm(value ?? `b${nextBlankNode++}`);

/**
 * A literal: a string is a language tag (`rdf:langString`), a language with a direction a directional one
 * (`rdf:dirLangString`), a named node a datatype; none makes an `xsd:string`. Language tags are compared lower-case,
 * as RDF 1.1 requires.
 */
export const literal = (
  value: string,
  languageOrDatatype?: string | RdfJs.NamedNode | RdfJs.DirectionalLanguage,
): RdfJs.Literal => {
  if (typeof languageOrDatatype === 'string') {
    return languageOrDatatype.length > 0
      ? new LiteralTerm(value, languageOrDatatype.toLowerCase(), LANG_STRING_DATATYPE)
      : new LiteralTerm(value, '', STRING_DATATYPE);
  }
  if (languageOrDatatype === undefined) {
    return new LiteralTerm(value, '', STRING_DATATYPE);
  }
  if ('termType' in languageOrDatatype) {
    return new LiteralTerm(value, '', namedNode(languageOrDatatype.value));
  }
  const { language, direction } = languageOrDatatype;
  return direction
    ? new LiteralTerm(value, language.toLowerCase(), DIR_LANG_STRING_DATATYPE, direction)
    : new LiteralTerm(value, language.toLowerCase(), LANG_STRING_DATATYPE);
};

/** A SPARQL variable; `value` is its name without the leading `?`. */
export const variable = (value: string): RdfJs.Variable => new VariableTerm(value);

/** The default graph; every call returns the same term. */
export const defaultGraph = (): RdfJs.DefaultGraph => DEFAULT_GRAPH;

/** A quad; a missing or `null` graph is the default graph, as RDF/JS requires. */
export const quad = (
  subject: RdfJs.Quad_Subject,
  predicate: RdfJs.Quad_Predicate,
  object: RdfJs.Quad_Object,
  graph?: RdfJs.Quad_Graph | null,
): RdfJs.Quad => new QuadTerm(subject, predicate, object, graph ?? DEFAULT_GRAPH);
