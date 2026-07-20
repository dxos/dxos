//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { buildSuggestionSources, suggestionColour, suggestionGroups } from './suggestion-sources';

const source = (author: string, content: string) => ({ author, colour: suggestionColour(author), content });

describe('suggestionColour', () => {
  test('is deterministic per author', () => {
    expect(suggestionColour('did:alice')).toBe(suggestionColour('did:alice'));
  });

  test('differs between authors', () => {
    expect(suggestionColour('did:alice')).not.toBe(suggestionColour('did:bob'));
  });

  test('is a valid hsl string', () => {
    expect(suggestionColour('did:alice')).toMatch(/^hsl\(\d{1,3} 65% 50%\)$/);
  });
});

describe('buildSuggestionSources', () => {
  test('colours each author and preserves content', () => {
    const sources = buildSuggestionSources([{ author: 'did:alice', content: 'A' }]);
    expect(sources).toEqual([{ author: 'did:alice', colour: suggestionColour('did:alice'), content: 'A' }]);
  });

  test('orders by author DID regardless of input order (deterministic stacking)', () => {
    const sources = buildSuggestionSources([
      { author: 'did:bob', content: 'B' },
      { author: 'did:alice', content: 'A' },
    ]);
    expect(sources.map((source) => source.author)).toEqual(['did:alice', 'did:bob']);
  });

  test('handles no branches', () => {
    expect(buildSuggestionSources([])).toEqual([]);
  });
});

describe('suggestionGroups', () => {
  const BASE = 'The quick brown fox jumps over the lazy dog.';

  test('produces an attributed card per change, tagged by author', () => {
    const groups = suggestionGroups(BASE, [
      source('did:alice', 'The fast brown fox jumps over the sleepy dog.'),
      source('did:bob', 'The swift brown fox leaps over the lazy dog.'),
    ]);
    // Alice: quick→fast, lazy→sleepy; Bob: quick→swift, jumps→leaps.
    expect(groups).toHaveLength(4);
    expect(groups.every((group) => group.colour === suggestionColour(group.author))).toBe(true);
    expect(groups.every((group) => BASE.slice(group.from, group.to) === group.removed)).toBe(true);
  });

  test('orders by offset then author (matches overlay stacking)', () => {
    const groups = suggestionGroups(BASE, [
      source('did:bob', 'The swift brown fox jumps over the lazy dog.'),
      source('did:alice', 'The fast brown fox jumps over the lazy dog.'),
    ]);
    // Both change "quick" at the same offset → Alice before Bob.
    expect(groups.map((group) => [group.author, group.inserted])).toEqual([
      ['did:alice', 'fast'],
      ['did:bob', 'swift'],
    ]);
  });

  test('coalesces adjacent hunks into one card when a grouping policy is given', () => {
    const ungrouped = suggestionGroups('alpha bravo charlie', [source('did:alice', 'ALPHA bravo CHARLIE')]);
    expect(ungrouped).toHaveLength(2);
    const grouped = suggestionGroups('alpha bravo charlie', [source('did:alice', 'ALPHA bravo CHARLIE')], {
      maxGap: 8,
    });
    expect(grouped).toHaveLength(1);
  });
});
