//
// Copyright 2026 DXOS.org
//

import { Parser, Writer } from 'n3';
import { describe, test } from 'vitest';

import * as Fact from './Fact.ts';
import * as Graph from './Graph.ts';
import * as Mapping from './Mapping.ts';
import * as Pipeline from './Pipeline.ts';
import * as Rdf from './Rdf.ts';
import * as Trig from './Trig.ts';

const EX = 'https://example.org/';
const XSD = 'http://www.w3.org/2001/XMLSchema#';

/** n3's TriG for the same quads, the format this writer reproduces. */
const n3Trig = (quads: readonly Rdf.Quad[], prefixes: Record<string, string> = {}): string => {
  const writer = new Writer({ format: 'application/trig', prefixes });
  writer.addQuads([...quads]);
  let output = '';
  writer.end((error, result) => {
    if (error) {
      throw error;
    }
    output = result;
  });
  return output;
};

const parse = (trig: string): Rdf.Quad[] => new Parser({ format: 'application/trig' }).parse(trig);

const sameQuads = (left: readonly Rdf.Quad[], right: readonly Rdf.Quad[]): boolean =>
  left.length === right.length && left.every((quad) => right.some((other) => other.equals(quad)));

const ex = (name: string) => Rdf.namedNode(`${EX}${name}`);

const fact = (id: string, quote: string): Fact.Fact =>
  Fact.make({
    id,
    assertion: {
      subject: { kind: 'entity', entity: 'rich', label: 'Rich "the founder"' },
      predicate: 'has role',
      object: { kind: 'entity', entity: 'founder' },
      quote,
    },
    factuality: { value: 'CT+', polarity: '+' },
    attribution: { source: 'https://dxos.org/team', generatedAtTime: '2026-10-13T00:00:00Z' },
    recordedAt: '2026-10-13T00:00:00Z',
    extractor: { id: 'default', model: 'm', version: '1' },
    sourceHash: 'h',
  });

describe('Trig', () => {
  test('writes nothing for no quads, and only the prefix block for prefixes alone', ({ expect }) => {
    expect(Trig.write([])).toBe('');
    expect(Trig.write([], { prefixes: { ex: EX } })).toBe(n3Trig([], { ex: EX }));
  });

  test('groups a subject with `;` and a predicate with `,`, in the default and a named graph', ({ expect }) => {
    const quads = [
      Rdf.quad(ex('s'), ex('p'), ex('o1')),
      Rdf.quad(ex('s'), ex('p'), ex('o2')),
      Rdf.quad(ex('s'), ex('q'), Rdf.literal('v')),
      Rdf.quad(ex('t'), ex('p'), ex('o1')),
      Rdf.quad(ex('s'), ex('p'), ex('o1'), ex('g')),
      Rdf.quad(ex('s'), ex('q'), ex('o2'), ex('g')),
      Rdf.quad(ex('u'), ex('p'), ex('o1'), ex('h')),
      Rdf.quad(ex('s'), ex('p'), ex('o3')),
    ];
    expect(Trig.write(quads)).toBe(n3Trig(quads));
    expect(Trig.write(quads, { prefixes: { ex: EX } })).toBe(n3Trig(quads, { ex: EX }));
    expect(sameQuads(parse(Trig.write(quads, { prefixes: { ex: EX } })), quads)).toBe(true);
  });

  test('abbreviates IRIs only where the local name is valid, and writes rdf:type as `a`', ({ expect }) => {
    const quads = [
      Rdf.quad(ex('valid_name-1'), Rdf.namedNode(Rdf.RDF_TYPE), ex('Thing')),
      Rdf.quad(ex('has/slash'), ex('p'), ex('with space')),
      Rdf.quad(ex('café'), ex('p'), Rdf.namedNode(`${EX}`)),
      Rdf.quad(Rdf.namedNode('https://other.org/x'), ex('p'), Rdf.blankNode('b1')),
    ];
    const prefixes = { ex: EX, other: 'https://other.org/' };
    expect(Trig.write(quads, { prefixes })).toBe(n3Trig(quads, prefixes));
    expect(Trig.write(quads, { prefixes })).toContain('ex:valid_name-1 a ex:Thing');
  });

  test('a later prefix for the same namespace replaces the earlier one', ({ expect }) => {
    const quads = [Rdf.quad(ex('s'), ex('p'), ex('o'))];
    const prefixes = { first: EX, second: EX };
    expect(Trig.write(quads, { prefixes })).toBe(n3Trig(quads, prefixes));
    expect(Trig.write(quads, { prefixes })).toContain('second:s second:p second:o');
  });

  test('escapes literals: quotes, backslashes, control characters and astral characters', ({ expect }) => {
    const values = [
      'say "hi"',
      'back\\slash',
      'tab\tline\nreturn\rfeed\fbell\b',
      '\u0001\u0019\u001a\u001f',
      'emoji 😀',
      'lone \ud800 high',
      'lone \udc00 low',
      'plain',
    ];
    const quads = values.map((value, index) => Rdf.quad(ex(`s${index}`), ex('p'), Rdf.literal(value)));
    expect(Trig.write(quads)).toBe(n3Trig(quads));
    expect(parse(Trig.write(quads)).map((quad) => quad.object.value)).toEqual(values);
  });

  test('writes language tags, abbreviates valid numbers and booleans, and keeps other datatypes', ({ expect }) => {
    const typed = (value: string, type: string) => Rdf.literal(value, Rdf.namedNode(`${XSD}${type}`));
    const objects = [
      Rdf.literal('chat', 'fr'),
      typed('42', 'integer'),
      typed('-4.2', 'decimal'),
      typed('1.5e3', 'double'),
      typed('true', 'boolean'),
      typed('maybe', 'boolean'),
      typed('4x', 'integer'),
      typed('2026-10-13', 'date'),
      Rdf.literal('{}', Rdf.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#JSON')),
    ];
    const quads = objects.map((object, index) => Rdf.quad(ex(`s${index}`), ex('p'), object));
    expect(Trig.write(quads)).toBe(n3Trig(quads));
    expect(Trig.write(quads, { prefixes: { xsd: XSD } })).toBe(n3Trig(quads, { xsd: XSD }));
    expect(sameQuads(parse(Trig.write(quads, { prefixes: { xsd: XSD } })), quads)).toBe(true);
  });

  test("a store's facts round-trip through an independent TriG parser", ({ expect }) => {
    const facts = Graph.assign([fact('a', 'Rich is the founder.'), fact('b', 'He said: "I founded it"\n— twice.')]);
    const quads = facts.flatMap((placed) => Mapping.factToTriples(placed));
    const trig = Graph.toTriG(facts);
    const parsed = parse(trig);
    expect(sameQuads(parsed, quads)).toBe(true);
    expect(Mapping.triplesToFacts(parsed)).toEqual(Mapping.triplesToFacts(quads));
    expect(trig).toBe(
      n3Trig(
        quads,
        Object.fromEntries(
          [...trig.matchAll(/^@prefix (\w+): <([^>]+)>\.$/gm)].map(([, prefix, iri]) => [prefix, iri]),
        ),
      ),
    );
  });

  test("a pipeline's state round-trips as TriG", ({ expect }) => {
    const state: Pipeline.State = {
      name: 'crawl "general"',
      status: 'done',
      startedAt: '2026-10-13T00:00:00Z',
      endedAt: '2026-10-13T01:00:00Z',
      sources: [{ id: 'general', items: 3, cursor: '42' }],
      stages: [{ id: 'extract', label: 'Extract', order: 0, models: [] }],
      facts: 7,
    };
    const quads = Pipeline.toQuads(state);
    const trig = Trig.write(quads);
    expect(trig).toBe(n3Trig(quads));
    expect(Pipeline.fromValues(parse(trig).map((quad) => quad.object.value))).toEqual([state]);
  });
});
