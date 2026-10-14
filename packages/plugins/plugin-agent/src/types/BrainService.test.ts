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
});
