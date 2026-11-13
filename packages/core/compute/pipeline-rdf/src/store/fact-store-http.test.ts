//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { SemanticIndexError } from '../errors.ts';
import { serveFactStore } from '../testing/fact-server.ts';
import { type Fact } from '../types/index.ts';
import * as FactStoreHttp from './fact-store-http.ts';
import * as FactStoreLive from './fact-store-live.ts';

const fact = (id: string, subject: string): Fact => ({
  id,
  assertion: {
    subject: { kind: 'entity', entity: subject, label: subject },
    predicate: 'works on',
    object: { kind: 'entity', entity: 'opfs' },
  },
  factuality: { value: 'CT+', polarity: '+', confidence: 0.9 },
  attribution: { agent: subject, source: `dxn:q:${id}`, generatedAtTime: '2026-11-13T00:00:00.000Z' },
  recordedAt: '2026-11-13T00:00:00.000Z',
  extractor: { id: 'default', model: 'm', version: '1' },
  sourceHash: id,
});

describe('FactStoreHttp', () => {
  it.effect(
    'serves every FactStore method to the HTTP client',
    Effect.fnUntraced(function* () {
      yield* Effect.scoped(
        Effect.gen(function* () {
          const backing = FactStoreLive.makeMemory();
          const { url } = yield* serveFactStore(backing);
          const client = FactStoreHttp.make(url);

          yield* client.putFacts([fact('f1', 'alice'), fact('f2', 'bob')]);
          const all = yield* client.query({});
          expect(all.map((found) => found.id).sort()).toEqual(['f1', 'f2']);
          expect((yield* client.query({ subjectEntity: 'alice' })).map((found) => found.id)).toEqual(['f1']);
          expect((yield* backing.query({})).length).toBe(2);

          expect((yield* client.predicates()).length).toBeGreaterThan(0);

          expect(yield* client.cursor('dxn:q:src')).toBeUndefined();
          yield* client.setCursor('dxn:q:src', 'hash-1');
          expect(yield* client.cursor('dxn:q:src')).toBe('hash-1');

          yield* client.clear();
          expect(yield* client.query({})).toEqual([]);
        }),
      );
    }),
  );

  it.effect(
    'reports a store failure as a SemanticIndexError',
    Effect.fnUntraced(function* () {
      yield* Effect.scoped(
        Effect.gen(function* () {
          const { url } = yield* serveFactStore(FactStoreLive.makeMemory());
          const error = yield* FactStoreHttp.make(url).select('this is not sparql').pipe(Effect.flip);
          expect(error).toBeInstanceOf(SemanticIndexError);
          expect(error.message).toContain('HTTP 500');
        }),
      );
    }),
  );

  it.effect(
    'fails with a SemanticIndexError when the server is unreachable',
    Effect.fnUntraced(function* () {
      const error = yield* FactStoreHttp.make('http://127.0.0.1:1').query({}).pipe(Effect.flip);
      expect(error.message).toContain('unreachable');
    }),
  );
});
