//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { frontmatterCompletion } from './completion.ts';
import { LAYOUTS } from './frontmatter.ts';

/** Completes at the `|` marker. */
const complete = (marked: string) => frontmatterCompletion(marked.replace('|', ''), marked.indexOf('|'));

describe('frontmatterCompletion', () => {
  test('offers every layout after `layout:`', () => {
    const result = complete('---\nlayout: |\n---\n# Title');
    expect(result?.options).toEqual(LAYOUTS);
    expect(result?.prefix).toBe('');
  });

  test('filters by the value typed so far and replaces it', () => {
    const content = '---\nlayout: two|\n---\n';
    const result = complete(content);
    expect(result?.options).toEqual(['two-cols', 'two-cols-header', 'two-by-two']);
    expect(result?.from).toBe(content.indexOf('two'));
  });

  test('nothing outside the frontmatter, on other keys, or before the colon', () => {
    expect(complete('# Title\n\nlayout: |')).toBeNull();
    expect(complete('---\nimage: |\n---\n')).toBeNull();
    expect(complete('---\nlay|out: cover\n---\n')).toBeNull();
  });
});
