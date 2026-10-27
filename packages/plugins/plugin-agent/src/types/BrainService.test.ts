//
// Copyright 2026 DXOS.org
//

import { describe, it } from 'vitest';

import { type RDF } from '@dxos/pipeline-rdf';

import * as BrainService from './BrainService.ts';

describe('BrainService', () => {
  it('a negated fact is marked "not:", so a denial is not recalled as the assertion it denies', ({ expect }) => {
    const denial = {
      id: 'fact-1',
      assertion: {
        subject: { kind: 'entity', entity: 'kai', label: 'Kai' },
        predicate: 'has spoken with',
        object: { kind: 'entity', entity: 'dima', label: 'Dima' },
      },
      factuality: { value: 'CT-', polarity: '-' },
      attribution: { source: 'test', generatedAtTime: '2026-10-13T12:00:00Z' },
      recordedAt: '2026-10-13T12:00:00Z',
      extractor: { id: 'test', model: 'none', version: '1' },
      sourceHash: 'fact-1',
    } satisfies RDF.Fact;
    expect(BrainService.factText(denial)).toBe('not: Kai has spoken with Dima');
  });

  it('a fact expires at the instant its validTo names, whatever the offset or precision', ({ expect }) => {
    const fact = (id: string, validTo?: string): RDF.Fact => ({
      id,
      assertion: {
        subject: { kind: 'entity', entity: 'kai', label: 'Kai' },
        predicate: 'works at',
        object: { kind: 'entity', entity: 'acme', label: 'Acme' },
        ...(validTo !== undefined ? { validTo } : {}),
      },
      factuality: { value: 'CT+', polarity: '+' },
      attribution: { source: 'test', generatedAtTime: '2026-10-13T12:00:00Z' },
      recordedAt: '2026-10-13T12:00:00Z',
      extractor: { id: 'test', model: 'none', version: '1' },
      sourceHash: id,
    });
    const now = '2026-10-16T12:00:00.000Z';
    const facts = [
      fact('open'),
      // 13:30 at +02:00 is 11:30Z: already past, though it sorts after `now` as a string.
      fact('offset-past', '2026-10-16T13:30:00+02:00'),
      // 08:30 at -05:00 is 13:30Z: still ahead, though it sorts before `now` as a string.
      fact('offset-future', '2026-10-16T08:30:00-05:00'),
      fact('second-precision', '2026-10-16T12:00:01Z'),
      fact('exactly-now', '2026-10-16T12:00:00Z'),
      fact('unparseable', 'until further notice'),
    ];
    expect(BrainService.currentFacts(facts, now).map(({ id }) => id)).toEqual([
      'open',
      'offset-future',
      'second-precision',
      'unparseable',
    ]);
  });
});
