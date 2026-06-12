//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { PageAction } from '#types';

import { toNote, toOrganization, toPerson } from './mapping';

const baseSource: PageAction.Source = {
  url: 'https://www.linkedin.com/in/ricburdon',
  title: 'Rich Burdon | LinkedIn',
  clippedAt: '2026-04-23T12:00:00.000Z',
};

const baseSelection: PageAction.Selection = {
  text: 'Rich Burdon\nFounder, DXOS\nBrooklyn, NY',
};

const makeSnapshot = (overrides: Partial<PageAction.Snapshot> = {}): PageAction.Snapshot => ({
  source: baseSource,
  selection: baseSelection,
  ...overrides,
});

describe('mapping', () => {
  test('Person prefers h1 for fullName', ({ expect }) => {
    const person = toPerson(makeSnapshot({ hints: { h1: 'Rich Burdon', ogTitle: 'LinkedIn' } }));
    expect(person.fullName).toBe('Rich Burdon');
    expect(person.urls?.[0]?.value).toBe(baseSource.url);
  });

  test('Person falls back to og:title, then first line of text', ({ expect }) => {
    const fromOg = toPerson(makeSnapshot({ hints: { ogTitle: 'Jane Doe' } }));
    expect(fromOg.fullName).toBe('Jane Doe');

    const fromText = toPerson(makeSnapshot({ hints: {} }));
    expect(fromText.fullName).toBe('Rich Burdon');
  });

  test('Person allows empty name when no candidate is present', ({ expect }) => {
    const person = toPerson(makeSnapshot({ hints: {}, selection: { text: '' } }));
    expect(person.fullName).toBeUndefined();
  });

  test('Organization prefers og:title, then h1', ({ expect }) => {
    const fromOg = toOrganization(makeSnapshot({ hints: { ogTitle: 'DXOS', h1: 'Ignored' } }));
    expect(fromOg.name).toBe('DXOS');

    const fromH1 = toOrganization(makeSnapshot({ hints: { h1: 'DXOS' } }));
    expect(fromH1.name).toBe('DXOS');
  });

  test('Organization sets website from source URL and description from og:description', ({ expect }) => {
    const org = toOrganization(
      makeSnapshot({
        source: { ...baseSource, url: 'https://example.com' },
        hints: { ogTitle: 'Example', ogDescription: 'An example company.' },
      }),
    );
    expect(org.website).toBe('https://example.com');
    expect(org.description).toBe('An example company.');
  });

  test('Note prefers h1 for title, then og:title, then first line, then source title', ({ expect }) => {
    const fromH1 = toNote(makeSnapshot({ hints: { h1: 'From H1', ogTitle: 'From OG' } }));
    expect(fromH1.name).toBe('From H1');

    const fromOg = toNote(makeSnapshot({ hints: { ogTitle: 'From OG' } }));
    expect(fromOg.name).toBe('From OG');

    const fromText = toNote(makeSnapshot({ hints: {} }));
    expect(fromText.name).toBe('Rich Burdon');

    const fromSource = toNote(makeSnapshot({ hints: {}, selection: { text: '' } }));
    expect(fromSource.name).toBe(baseSource.title);
  });

  test('mappers tolerate a snapshot without selection', ({ expect }) => {
    const person = toPerson(makeSnapshot({ selection: undefined, hints: {} }));
    expect(person.fullName).toBeUndefined();

    const note = toNote(makeSnapshot({ selection: undefined, hints: { h1: 'Title' } }));
    expect(note.content.target?.content).toContain('# Title');
  });
});
