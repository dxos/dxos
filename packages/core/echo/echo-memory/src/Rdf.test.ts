//
// Copyright 2026 DXOS.org
//

import { DataFactory } from 'n3';
import { describe, test } from 'vitest';

import * as Rdf from './Rdf.ts';

const IRI = 'https://example.org/a';

describe('Rdf', () => {
  test('a named node equals another with the same IRI, and nothing else', ({ expect }) => {
    const node = Rdf.namedNode(IRI);
    expect(node.termType).toBe('NamedNode');
    expect(node.value).toBe(IRI);
    expect(node.equals(Rdf.namedNode(IRI))).toBe(true);
    expect(node.equals(Rdf.namedNode(`${IRI}b`))).toBe(false);
    expect(node.equals(Rdf.blankNode(IRI))).toBe(false);
    expect(node.equals(Rdf.literal(IRI))).toBe(false);
    expect(node.equals(null)).toBe(false);
    expect(node.equals(undefined)).toBe(false);
  });

  test('blank nodes compare by label; an unlabelled one is fresh', ({ expect }) => {
    expect(Rdf.blankNode('x').equals(Rdf.blankNode('x'))).toBe(true);
    expect(Rdf.blankNode('x').equals(Rdf.blankNode('y'))).toBe(false);
    expect(Rdf.blankNode().equals(Rdf.blankNode())).toBe(false);
  });

  test('a plain literal is an xsd:string with no language', ({ expect }) => {
    const plain = Rdf.literal('hi');
    expect(plain.language).toBe('');
    expect(plain.datatype.value).toBe(Rdf.XSD_STRING);
    expect(plain.equals(Rdf.literal('hi'))).toBe(true);
    expect(plain.equals(Rdf.literal('hi', Rdf.namedNode(Rdf.XSD_STRING)))).toBe(true);
    expect(plain.equals(Rdf.literal('ho'))).toBe(false);
  });

  test('a language tag makes an rdf:langString, compared case-insensitively', ({ expect }) => {
    const tagged = Rdf.literal('chat', 'FR');
    expect(tagged.language).toBe('fr');
    expect(tagged.datatype.value).toBe(Rdf.RDF_LANG_STRING);
    expect(tagged.equals(Rdf.literal('chat', 'fr'))).toBe(true);
    expect(tagged.equals(Rdf.literal('chat', 'en'))).toBe(false);
    expect(tagged.equals(Rdf.literal('chat'))).toBe(false);
  });

  test('a datatype distinguishes otherwise equal literals', ({ expect }) => {
    const integer = Rdf.literal('1', Rdf.namedNode('http://www.w3.org/2001/XMLSchema#integer'));
    expect(integer.datatype.value).toBe('http://www.w3.org/2001/XMLSchema#integer');
    expect(integer.equals(Rdf.literal('1'))).toBe(false);
  });

  test('the default graph is one term, equal only to a default graph', ({ expect }) => {
    expect(Rdf.defaultGraph()).toBe(Rdf.defaultGraph());
    expect(Rdf.defaultGraph().value).toBe('');
    expect(Rdf.defaultGraph().equals(Rdf.namedNode(''))).toBe(false);
  });

  test('a quad equals another with equal terms, in the default graph unless given one', ({ expect }) => {
    const triple = Rdf.quad(Rdf.namedNode(IRI), Rdf.namedNode(`${IRI}/p`), Rdf.literal('o'));
    expect(triple.graph.termType).toBe('DefaultGraph');
    expect(triple.equals(Rdf.quad(Rdf.namedNode(IRI), Rdf.namedNode(`${IRI}/p`), Rdf.literal('o')))).toBe(true);
    expect(
      triple.equals(Rdf.quad(Rdf.namedNode(IRI), Rdf.namedNode(`${IRI}/p`), Rdf.literal('o'), Rdf.namedNode(IRI))),
    ).toBe(false);
    expect(triple.equals(Rdf.quad(Rdf.namedNode(IRI), Rdf.namedNode(`${IRI}/p`), Rdf.literal('x')))).toBe(false);
  });

  test('terms are interchangeable with another RDF/JS implementation', ({ expect }) => {
    expect(Rdf.namedNode(IRI).equals(DataFactory.namedNode(IRI))).toBe(true);
    expect(DataFactory.namedNode(IRI).equals(Rdf.namedNode(IRI))).toBe(true);
    expect(Rdf.literal('chat', 'fr').equals(DataFactory.literal('chat', 'fr'))).toBe(true);
    expect(DataFactory.literal('chat', 'fr').equals(Rdf.literal('chat', 'fr'))).toBe(true);
    expect(Rdf.literal('hi').equals(DataFactory.literal('hi'))).toBe(true);
    expect(Rdf.defaultGraph().equals(DataFactory.defaultGraph())).toBe(true);
    const ours = Rdf.quad(Rdf.namedNode(IRI), Rdf.namedNode(IRI), Rdf.literal('o'), Rdf.namedNode(IRI));
    const theirs = DataFactory.quad(
      DataFactory.namedNode(IRI),
      DataFactory.namedNode(IRI),
      DataFactory.literal('o'),
      DataFactory.namedNode(IRI),
    );
    expect(ours.equals(theirs)).toBe(true);
    expect(theirs.equals(ours)).toBe(true);
  });
});
