//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { spaceHeadings } from './headings.ts';

describe('spaceHeadings', () => {
  test('separates a heading from the paragraph above it', () => {
    expect(spaceHeadings('First.\n## Schema: Task gains attachments\nBody.')).to.equal(
      'First.\n\n## Schema: Task gains attachments\nBody.',
    );
  });

  test('leaves an already separated heading and a leading heading alone', () => {
    const markdown = '# Title\n\nWhy.\n\n## One\n\nFirst.\n';
    expect(spaceHeadings(markdown)).to.equal(markdown);
  });

  test('ignores hash lines inside a code fence', () => {
    const markdown = 'Prose.\n\n```diff file=a.sh\n+echo\n# a shell comment\n```\n';
    expect(spaceHeadings(markdown)).to.equal(markdown);
  });

  test('does not treat a hashtag as a heading', () => {
    const markdown = 'Prose.\n#hashtag';
    expect(spaceHeadings(markdown)).to.equal(markdown);
  });
});
