//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { firstHeading } from './heading.ts';

describe('firstHeading', () => {
  test('ignores headings inside fenced code blocks', ({ expect }) => {
    expect(firstHeading('```sh\n# install\n```\n\n## Setup\n')).toBe('Setup');
    expect(firstHeading('~~~\n# a\n~~~\n# Title')).toBe('Title');
    expect(firstHeading('````\n```\n# nested\n```\n````\n# Outer')).toBe('Outer');
  });

  test('returns the first heading, or nothing', ({ expect }) => {
    expect(firstHeading('text\n# One\n# Two')).toBe('One');
    expect(firstHeading('### Spaced ###')).toBe('Spaced');
    expect(firstHeading('no headings')).toBeUndefined();
  });
});
