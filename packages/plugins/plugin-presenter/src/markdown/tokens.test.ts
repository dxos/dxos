//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { type SlideTokenKind, slideTokens } from './tokens.ts';

/** Each token as `kind:text`, so expectations read as the highlighted source. */
const spans = (content: string, kind?: SlideTokenKind) =>
  slideTokens(content)
    .filter((token) => kind === undefined || token.kind === kind)
    .map((token) => `${token.kind}:${content.slice(token.from, token.to)}`);

describe('slideTokens', () => {
  test('frontmatter block, delimiters and keys', () => {
    const content = '---\nlayout: two-cols\nimage: a.png\n---\n# Title';
    expect(spans(content, 'frontmatter-delimiter')).toEqual(['frontmatter-delimiter:---', 'frontmatter-delimiter:---']);
    expect(spans(content, 'frontmatter-key')).toEqual(['frontmatter-key:layout', 'frontmatter-key:image']);
    expect(spans(content, 'frontmatter')).toEqual(['frontmatter:---\nlayout: two-cols\nimage: a.png\n---\n']);
  });

  test('slot markers, click tags, Surface tags with attribute names, and object embeds', () => {
    const content = [
      '<v-clicks every="2">',
      '',
      '- one',
      '',
      '</v-clicks>',
      '::right::',
      '<Surface ref="echo:///A" role="card" />',
      '![Chart](echo:///B)',
      '![Photo](a.png)',
    ].join('\n');
    expect(spans(content).filter((span) => !span.startsWith('tag-attribute'))).toEqual([
      'tag:<v-clicks every="2">',
      'tag:</v-clicks>',
      'slot:::right::',
      'tag:<Surface ref="echo:///A" role="card" />',
      'embed:![Chart](echo:///B)',
    ]);
    expect(spans(content, 'tag-attribute')).toEqual(['tag-attribute:every', 'tag-attribute:ref', 'tag-attribute:role']);
  });

  test('trailing notes, and nothing inside fenced code or the notes', () => {
    const content = ['```html', '<v-click>', '```', '', 'Text', '', '<!--', '<v-click> in notes', '-->'].join('\n');
    expect(spans(content)).toEqual(['notes:<!--\n<v-click> in notes\n-->']);
  });

  test('tokens are ordered for decoration: by start, a span before the parts inside it', () => {
    const tokens = slideTokens('---\nlayout: center\n---\n# T');
    expect(tokens.map((token) => token.kind)).toEqual([
      'frontmatter',
      'frontmatter-delimiter',
      'frontmatter-key',
      'frontmatter-delimiter',
    ]);
  });
});
