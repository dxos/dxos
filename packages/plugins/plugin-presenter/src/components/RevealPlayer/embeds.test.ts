//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { markEmbeds } from './embeds.ts';

describe('markEmbeds', () => {
  test('replaces an object embed with a block naming its URI and label', ({ expect }) => {
    expect(markEmbeds('# Timeline\n\n![Macro "timeline"|480](echo:///01ABC)\n')).toBe(
      '# Timeline\n\n<div class="dx-slide-embed" data-uri="echo:///01ABC" data-label="Macro &quot;timeline&quot;"></div>\n',
    );
  });

  test('leaves web images and links alone', ({ expect }) => {
    const content = '![logo](https://example.com/logo.png) and [link](echo:///01ABC)';
    expect(markEmbeds(content)).toBe(content);
  });
});
