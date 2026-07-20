//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { buildSuggestionSources, suggestionColour } from './suggestion-sources';

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
