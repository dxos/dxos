//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type Clip } from '#types';

import { mapClip, toOrganization, toPerson } from './mapping';

const baseSource: Clip.Source = {
  url: 'https://www.linkedin.com/in/ricburdon',
  title: 'Rich Burdon | LinkedIn',
  clippedAt: '2026-04-23T12:00:00.000Z',
};

const baseSelection: Clip.Selection = {
  text: 'Rich Burdon\nFounder, DXOS\nBrooklyn, NY',
};

const makeClip = (overrides: Partial<Clip.Clip> = {}): Clip.Clip => ({
  version: 1,
  kind: 'person',
  source: baseSource,
  selection: baseSelection,
  ...overrides,
});

describe('mapping', () => {
  test('Person prefers h1 for fullName', ({ expect }) => {
    const person = toPerson(makeClip({ hints: { h1: 'Rich Burdon', ogTitle: 'LinkedIn' } }));
    expect(person.fullName).toBe('Rich Burdon');
    expect(person.urls?.[0]?.value).toBe(baseSource.url);
  });

  test('Person falls back to og:title, then first line of text', ({ expect }) => {
    const fromOg = toPerson(makeClip({ hints: { ogTitle: 'Jane Doe' } }));
    expect(fromOg.fullName).toBe('Jane Doe');

    const fromText = toPerson(makeClip({ hints: {} }));
    expect(fromText.fullName).toBe('Rich Burdon');
  });

  test('Person allows empty name when no candidate is present', ({ expect }) => {
    const person = toPerson(makeClip({ hints: {}, selection: { text: '' } }));
    expect(person.fullName).toBeUndefined();
  });

  test('Organization prefers og:title, then h1', ({ expect }) => {
    const fromOg = toOrganization(makeClip({ kind: 'organization', hints: { ogTitle: 'DXOS', h1: 'Ignored' } }));
    expect(fromOg.name).toBe('DXOS');

    const fromH1 = toOrganization(makeClip({ kind: 'organization', hints: { h1: 'DXOS' } }));
    expect(fromH1.name).toBe('DXOS');
  });

  test('Organization sets website from source URL and description from og:description', ({ expect }) => {
    const org = toOrganization(
      makeClip({
        kind: 'organization',
        source: { ...baseSource, url: 'https://example.com' },
        hints: { ogTitle: 'Example', ogDescription: 'An example company.' },
      }),
    );
    expect(org.website).toBe('https://example.com');
    expect(org.description).toBe('An example company.');
  });

  test('mapClip dispatches on kind', ({ expect }) => {
    const person = mapClip(makeClip({ kind: 'person', hints: { h1: 'Alice' } }));
    expect((person as any)?.fullName).toBe('Alice');

    const org = mapClip(makeClip({ kind: 'organization', hints: { ogTitle: 'Acme' } }));
    expect((org as any)?.name).toBe('Acme');
  });

  test('mapClip returns undefined for unknown kind', ({ expect }) => {
    // Unknown kinds are intentionally allowed by the envelope schema; the
    // receiver rejects them with an `unsupported-kind` ack.
    const result = mapClip(makeClip({ kind: 'place' as any }));
    expect(result).toBeUndefined();
  });
});
