//
// Copyright 2026 DXOS.org
//

import { XMLParser } from 'fast-xml-parser';
import { readFileSync } from 'node:fs';

import { type Row, type Term } from '../../terms.ts';
import { parseRdfFile } from './rdf.ts';

/** A query answer in a shape every engine and every expected-result format can be brought to. */
export type ResultSet =
  | { kind: 'bindings'; vars: string[]; rows: Row[] }
  | { kind: 'boolean'; value: boolean }
  | { kind: 'graph'; triples: Row[] };

const RS = 'http://www.w3.org/2001/sw/DataAccess/tests/result-set#';
const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';

/** Reads an expected-result file: SPARQL XML (`.srx`), SPARQL JSON (`.srj`) or RDF (result-set vocabulary or a graph). */
export const readExpected = (path: string, iri: string, graphResult: boolean): ResultSet => {
  if (path.endsWith('.srx')) {
    return parseSrx(readFileSync(path, 'utf8'));
  }
  if (path.endsWith('.srj')) {
    return parseSrj(readFileSync(path, 'utf8'));
  }
  const triples = parseRdfFile(path, iri);
  if (graphResult) {
    return { kind: 'graph', triples: triples.map(({ s, p, o }) => ({ s, p, o })) };
  }
  return fromResultSetGraph(triples.map(({ s, p, o }) => ({ s, p, o })));
};

//
// SPARQL Query Results XML.
//

type XmlNode = { [key: string]: unknown };

const isNode = (value: unknown): value is XmlNode => typeof value === 'object' && value !== null;

const children = (node: XmlNode, name: string): XmlNode[] => {
  const value = node[name];
  return Array.isArray(value) ? value.filter(isNode) : isNode(value) ? [value] : [];
};

const child = (node: XmlNode, name: string): XmlNode | undefined => children(node, name)[0];

const text = (node: XmlNode): string => {
  const value = node['#text'];
  return typeof value === 'string' ? value : '';
};

const attr = (node: XmlNode, name: string): string | undefined => {
  const value = node[`@_${name}`];
  return typeof value === 'string' ? value : undefined;
};

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  alwaysCreateTextNode: true,
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: false,
  removeNSPrefix: false,
  isArray: (name) => ['variable', 'result', 'binding'].includes(name),
});

export const parseSrx = (xml: string): ResultSet => {
  const parsed: unknown = xmlParser.parse(xml);
  const sparql = isNode(parsed) ? child(parsed, 'sparql') : undefined;
  if (!sparql) {
    throw new Error('not a SPARQL XML result');
  }
  const boolean = child(sparql, 'boolean');
  if (boolean) {
    return { kind: 'boolean', value: text(boolean).trim() === 'true' };
  }
  const head = child(sparql, 'head');
  const vars = (head ? children(head, 'variable') : []).flatMap((node) => attr(node, 'name') ?? []);
  const results = child(sparql, 'results');
  const rows = (results ? children(results, 'result') : []).map((result) => {
    const row: Row = {};
    for (const binding of children(result, 'binding')) {
      const name = attr(binding, 'name');
      if (name) {
        row[name] = srxTerm(binding);
      }
    }
    return row;
  });
  return { kind: 'bindings', vars, rows };
};

const srxTerm = (binding: XmlNode): Term => {
  const uri = child(binding, 'uri');
  if (uri) {
    return { termType: 'NamedNode', value: text(uri).trim() };
  }
  const bnode = child(binding, 'bnode');
  if (bnode) {
    return { termType: 'BlankNode', value: text(bnode).trim() };
  }
  const literal = child(binding, 'literal');
  if (!literal) {
    throw new Error('binding without a term');
  }
  return literalTerm(text(literal), attr(literal, 'datatype'), attr(literal, 'xml:lang'));
};

const literalTerm = (value: string, datatype?: string, language?: string): Term => ({
  termType: 'Literal',
  value,
  ...(language ? { language } : datatype && datatype !== 'http://www.w3.org/2001/XMLSchema#string' ? { datatype } : {}),
});

//
// SPARQL Query Results JSON.
//

type SrjTerm = { 'type': string; 'value': string; 'datatype'?: string; 'xml:lang'?: string };
type Srj = { head?: { vars?: string[] }; boolean?: boolean; results?: { bindings: Record<string, SrjTerm>[] } };

export const parseSrj = (json: string): ResultSet => {
  const parsed: Srj = JSON.parse(json);
  if (typeof parsed.boolean === 'boolean') {
    return { kind: 'boolean', value: parsed.boolean };
  }
  const rows = (parsed.results?.bindings ?? []).map((binding) => {
    const row: Row = {};
    for (const [name, term] of Object.entries(binding)) {
      row[name] =
        term.type === 'uri'
          ? { termType: 'NamedNode', value: term.value }
          : term.type === 'bnode'
            ? { termType: 'BlankNode', value: term.value }
            : literalTerm(term.value, term.datatype, term['xml:lang']);
    }
    return row;
  });
  return { kind: 'bindings', vars: parsed.head?.vars ?? [], rows };
};

//
// DAWG result-set vocabulary (SPARQL 1.0 `.ttl` / `.rdf` results).
//

const fromResultSetGraph = (triples: Row[]): ResultSet => {
  const objects = (subject: Term | undefined, predicate: string): Term[] =>
    triples
      .filter(
        (triple) =>
          subject &&
          triple.s?.value === subject.value &&
          triple.s.termType === subject.termType &&
          triple.p?.value === predicate,
      )
      .flatMap((triple) => (triple.o ? [triple.o] : []));
  const resultSet = triples.find((triple) => triple.p?.value === RDF_TYPE && triple.o?.value === `${RS}ResultSet`)?.s;
  if (!resultSet) {
    throw new Error('RDF result is neither a result set nor a CONSTRUCT graph');
  }
  const [boolean] = objects(resultSet, `${RS}boolean`);
  if (boolean) {
    return { kind: 'boolean', value: boolean.value === 'true' };
  }
  const vars = objects(resultSet, `${RS}resultVariable`).map((term) => term.value);
  const solutions = objects(resultSet, `${RS}solution`).map((solution) => {
    const row: Row = {};
    for (const binding of objects(solution, `${RS}binding`)) {
      const [variable] = objects(binding, `${RS}variable`);
      const [value] = objects(binding, `${RS}value`);
      if (variable && value) {
        row[variable.value] = value;
      }
    }
    const [index] = objects(solution, `${RS}index`);
    return { row, index: index ? Number(index.value) : 0 };
  });
  // Ordered results carry rs:index; the triples themselves are unordered.
  solutions.sort((left, right) => left.index - right.index);
  return { kind: 'bindings', vars, rows: solutions.map(({ row }) => row) };
};
