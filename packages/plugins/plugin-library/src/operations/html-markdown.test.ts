//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { htmlToMarkdown, markdownToHtml } from './html-markdown';

describe('html <-> markdown', () => {
  test('converts BookHive description HTML to markdown', ({ expect }) => {
    expect(htmlToMarkdown('<b>Bold</b> and <i>italic</i>.<br /><br />Second paragraph.')).toBe(
      '**Bold** and *italic*.\n\nSecond paragraph.',
    );
    expect(htmlToMarkdown('Ships &amp; shards')).toBe('Ships & shards');
    expect(htmlToMarkdown(undefined)).toBeUndefined();
  });

  test('inverse converts markdown emphasis and breaks back to HTML', ({ expect }) => {
    expect(markdownToHtml('**Bold** and *italic*.\nNext line.')).toBe('<b>Bold</b> and <i>italic</i>.<br />Next line.');
    expect(markdownToHtml(undefined)).toBeUndefined();
  });

  // The review round-trips user-authored prose, so the transform must not corrupt stray punctuation.
  test('leaves stray/unbalanced asterisks in prose untouched', ({ expect }) => {
    expect(markdownToHtml('Rated 4* stars, a *great* read')).toBe('Rated 4* stars, a <i>great</i> read');
    expect(markdownToHtml('2 * 4 = 8')).toBe('2 * 4 = 8');
  });

  test('keeps bare angle brackets in prose but strips real tags', ({ expect }) => {
    expect(htmlToMarkdown('if a < b > c')).toBe('if a < b > c');
    expect(htmlToMarkdown('<a href="x">link</a> and <b>bold</b>')).toBe('link and **bold**');
  });
});
