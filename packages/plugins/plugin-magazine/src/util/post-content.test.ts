//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { getImageUrl, getSnippet } from './post-content.ts';

describe('post content', () => {
  test('derives the hero image and snippet from a Markdown description', ({ expect }) => {
    const post = {
      description: [
        '**Bonds** slid into [distressed territory](https://example.com/bonds) this week.',
        '![](https://example.com/hero.jpg)',
        '![second](https://example.com/other.jpg)',
      ].join('\n\n'),
    };

    expect(getImageUrl(post)).toBe('https://example.com/hero.jpg');
    expect(getSnippet(post)).toBe('Bonds slid into distressed territory this week.');
  });

  test('derives the hero image and snippet from an HTML description', ({ expect }) => {
    const post = { description: '<p>A short summary.</p><img src="https://example.com/hero.jpg" alt="Hero">' };

    expect(getImageUrl(post)).toBe('https://example.com/hero.jpg');
    expect(getSnippet(post)).toBe('A short summary.');
  });

  test('strips underscore emphasis but keeps underscores that join words', ({ expect }) => {
    expect(getSnippet({ description: 'An _important_ and __bold__ note.' })).toBe('An important and bold note.');
    expect(getSnippet({ description: 'Set snake_case_names in the config.' })).toBe(
      'Set snake_case_names in the config.',
    );
  });
});
