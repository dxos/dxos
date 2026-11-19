//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { contentTitle, firstHeading } from './heading.ts';

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

describe('contentTitle', () => {
  test('is the title the frontmatter states, over the first heading', ({ expect }) => {
    expect(contentTitle("---\ntitle: 'DXOS'\nlayout: cover\n---\n\n# composer\n")).toBe('DXOS');
    expect(contentTitle('---\ntitle: Roadmap\n---\n\nNo heading here.\n')).toBe('Roadmap');
  });

  test('is the first heading where the frontmatter states none, or states an empty one', ({ expect }) => {
    expect(contentTitle('---\nlayout: default\n---\n\n# ECHO\n')).toBe('ECHO');
    expect(contentTitle("---\ntitle: ''\n---\n\n# ECHO\n")).toBe('ECHO');
    expect(contentTitle('# Plain\n')).toBe('Plain');
    expect(contentTitle('No title at all.')).toBeUndefined();
  });
});
