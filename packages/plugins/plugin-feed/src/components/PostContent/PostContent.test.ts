//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { dedupeImagesInMarkdown } from './PostContent';

describe('dedupeImagesInMarkdown', () => {
  test('strips an image whose URL matches the hero imageUrl', () => {
    const heroUrl = 'https://example.com/hero.jpg';
    const md = `Some intro paragraph.

![Photo](${heroUrl})

More body text.`;
    const out = dedupeImagesInMarkdown(md, [heroUrl]);
    expect(out).not.toContain(heroUrl);
    expect(out).toContain('Some intro paragraph.');
    expect(out).toContain('More body text.');
  });

  test('strips a second occurrence of the same image inside the body', () => {
    const url = 'https://example.com/photo.jpg';
    const md = `![A](${url})

Paragraph.

![A again](${url})`;
    const out = dedupeImagesInMarkdown(md, []);
    // Only one image markdown tag should remain.
    const matches = out.match(/!\[[^\]]*\]\([^)]*\)/g) ?? [];
    expect(matches).toHaveLength(1);
    expect(out).toContain('Paragraph.');
  });

  test('strips a duplicate <img> HTML tag inside the body', () => {
    const url = 'https://example.com/photo.jpg';
    const md = `<img src="${url}" alt="A" />

Body.

<img src="${url}" alt="B" />`;
    const out = dedupeImagesInMarkdown(md, []);
    const matches = out.match(/<img\b[^>]*>/gi) ?? [];
    expect(matches).toHaveLength(1);
    expect(out).toContain('Body.');
  });

  test('leaves distinct images alone', () => {
    const md = `![A](https://example.com/a.jpg)

![B](https://example.com/b.jpg)`;
    const out = dedupeImagesInMarkdown(md, []);
    expect(out).toContain('https://example.com/a.jpg');
    expect(out).toContain('https://example.com/b.jpg');
  });

  test('handles markdown image with title attribute', () => {
    const url = 'https://example.com/p.jpg';
    const md = `![alt](${url} "Caption text")\n\n![alt2](${url})`;
    const out = dedupeImagesInMarkdown(md, []);
    const matches = out.match(/!\[[^\]]*\]\([^)]*\)/g) ?? [];
    expect(matches).toHaveLength(1);
  });

  test('hero match dedupes against both Markdown and HTML occurrences', () => {
    const heroUrl = 'https://example.com/hero.jpg';
    const md = `<img src="${heroUrl}" />\n\n![also hero](${heroUrl})\n\nReal body.`;
    const out = dedupeImagesInMarkdown(md, [heroUrl]);
    expect(out).not.toContain(heroUrl);
    expect(out).toContain('Real body.');
  });

  test('ignores undefined entries in `excluded`', () => {
    const url = 'https://example.com/img.jpg';
    const md = `![Only image](${url})`;
    const out = dedupeImagesInMarkdown(md, [undefined]);
    expect(out).toContain(url);
  });
});
