//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type Entity } from '../client/types.ts';
import { unkeptPicks } from '../operations/sync-findings.ts';
import { matchPicks, newPicks, pickKey } from './picks.ts';

const place = (id: string, name: string, url?: string): Entity => ({
  id,
  types: ['schema:Restaurant'],
  props: {
    'schema:name': [name],
    'schema:servesCuisine': ['Thai'],
    'lh:ratingValue': [4.5],
    ...(url ? { 'schema:url': [url] } : {}),
  },
});

const results = [place('urn:a', 'Nam Cafe', 'https://nam.example'), place('urn:b', 'Board Room')];

describe('matchPicks', () => {
  test('by subject, else by name, else by url', ({ expect }) => {
    const matched = matchPicks(
      [
        { title: 'Anything', subject: 'urn:b', why: '' },
        { title: 'Nam Cafe — best library', why: '' },
        { title: 'Unknown place', url: 'https://nam.example', why: '' },
        { title: 'Nowhere', why: '' },
      ],
      results,
    );
    expect(matched.map((pick) => pick.entity?.id)).toEqual(['urn:b', 'urn:a', 'urn:a', undefined]);
    expect(matched[3] && pickKey(matched[3])).toBe('Nowhere');
  });

  test('newPicks drops picks already kept and duplicates', ({ expect }) => {
    const matched = matchPicks(
      [
        { title: 'Nam Cafe', why: '' },
        { title: 'Board Room', why: '' },
        { title: 'Nam Cafe again', subject: 'urn:a', why: '' },
      ],
      results,
    );
    expect(newPicks(matched, new Set(['urn:b'])).map(pickKey)).toEqual(['urn:a']);
  });
});

describe('SyncFindings (T-2)', () => {
  test('8 picks, 3 already kept as picks: 5 are appended', ({ expect }) => {
    const picks = Array.from({ length: 8 }, (_, index) => ({
      iri: `urn:${index}`,
      title: `Pick ${index}`,
      types: [],
      images: [],
      properties: {},
    }));
    const kept = [
      { iri: 'urn:0', keptBy: 'pick' },
      { iri: 'urn:3', keptBy: 'pick' },
      { iri: 'urn:7', keptBy: 'pick' },
      // A result the person starred is still appended as a pick when the report names it.
      { iri: 'urn:5', keptBy: 'person' },
    ];
    expect(unkeptPicks(picks, kept).map((pick) => pick.iri)).toEqual(['urn:1', 'urn:2', 'urn:4', 'urn:5', 'urn:6']);
  });
});
