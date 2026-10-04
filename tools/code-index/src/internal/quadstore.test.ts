//
// Copyright 2026 DXOS.org
//

import type { Quad } from '@rdfjs/types';
import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';
import { DataFactory } from 'n3';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, test } from 'vitest';

import * as EffectEx from '@dxos/effect/EffectEx';

import * as Quadstore from './quadstore.ts';

const { blankNode, namedNode, quad } = DataFactory;

class TestError extends Data.TaggedError('TestError')<{ readonly message: string; readonly cause: unknown }> {}

const ex = (name: string) => namedNode(`urn:ex:${name}`);

const RULES = `
@prefix ex: <urn:ex:>.
{ ?a ex:p ?b. ?b ex:q ?c } => { ?a ex:r ?c }.
{ ?a ex:dup ?b } => { ?a ex:seen ?b }.
`;

describe('quadstore reasoning', () => {
  const dirs: string[] = [];
  afterAll(async () => {
    await Promise.all(dirs.map((dir) => rm(dir, { recursive: true, force: true })));
  });

  /** Writes `quads` into a fresh store and reasons over them with premises split every `chunkSize` facts. */
  const reason = async (quads: readonly Quad[], chunkSize?: number) => {
    const dir = await mkdtemp(join(tmpdir(), 'code-index-quadstore-'));
    dirs.push(dir);
    const derived = await EffectEx.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const graph = yield* Quadstore.make(dir, (message) => (cause) => new TestError({ message, cause }), {
            chunkSize,
          });
          yield* graph.putQuads(quads);
          return yield* graph.reason(namedNode('urn:graph:derived'), RULES, false);
        }),
      ),
    );
    return derived
      .map((derivation) => `${derivation.subject.value} ${derivation.predicate.value} ${derivation.object.value}`)
      .sort();
  };

  test('a join across premise files derives what one file does', async ({ expect }) => {
    const file = namedNode('urn:graph:file');
    // Sorted by subject, `a p b` and `b q c` land in different files at one fact per file.
    const facts = [
      quad(ex('a'), ex('p'), ex('b'), file),
      quad(ex('b'), ex('q'), ex('c'), file),
      quad(ex('b'), ex('q'), ex('d'), file),
      quad(ex('z'), ex('filler'), ex('a'), file),
    ];
    const unchunked = await reason(facts);
    expect(unchunked).toEqual(['urn:ex:a urn:ex:r urn:ex:c', 'urn:ex:a urn:ex:r urn:ex:d']);
    expect(await reason(facts, 1)).toEqual(unchunked);
    expect(await reason(facts, 2)).toEqual(unchunked);
  });

  test('a fact asserted by two file graphs yields one derivation', async ({ expect }) => {
    const facts = [
      quad(ex('a'), ex('dup'), ex('b'), namedNode('urn:graph:one')),
      quad(ex('a'), ex('dup'), ex('b'), namedNode('urn:graph:two')),
    ];
    expect(await reason(facts, 1)).toEqual(['urn:ex:a urn:ex:seen urn:ex:b']);
  });
});

describe('premiseChunks', () => {
  test('facts are deduplicated across graphs, sorted by subject and split', ({ expect }) => {
    const chunks = Quadstore.premiseChunks(
      [
        quad(ex('c'), ex('p'), ex('x'), namedNode('urn:graph:one')),
        quad(ex('a'), ex('p'), ex('x'), namedNode('urn:graph:one')),
        quad(ex('a'), ex('p'), ex('x'), namedNode('urn:graph:two')),
        quad(ex('b'), ex('p'), ex('x'), namedNode('urn:graph:two')),
      ],
      2,
    );
    expect(chunks.map((chunk) => chunk.map((fact) => fact.subject.value))).toEqual([
      ['urn:ex:a', 'urn:ex:b'],
      ['urn:ex:c'],
    ]);
    expect(chunks.flat().every((fact) => fact.graph.termType === 'DefaultGraph')).toBe(true);
  });

  test('every fact naming a blank node shares one file, since a label is scoped to its file', ({ expect }) => {
    const node = blankNode('shared');
    const chunks = Quadstore.premiseChunks(
      [
        quad(ex('a'), ex('p'), node),
        quad(node, ex('q'), ex('b')),
        quad(ex('c'), ex('p'), ex('d')),
        quad(ex('e'), ex('p'), ex('f')),
      ],
      1,
    );
    expect(chunks).toHaveLength(3);
    expect(chunks[2].map((fact) => fact.predicate.value)).toEqual(['urn:ex:q', 'urn:ex:p']);
  });

  test('a chunk size that would never advance is rejected', ({ expect }) => {
    expect(() => Quadstore.premiseChunks([], 0)).toThrow(RangeError);
  });
});
