//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { injectLinkPreview, readLinkTitle } from './link-preview.ts';

describe('link preview', () => {
  test('reads a collapsed, truncated title', ({ expect }) => {
    expect(readLinkTitle(new URL('https://composer.test/w/a?title=%20Plan%20%20A%20'))).toBe('Plan A');
    expect(readLinkTitle(new URL('https://composer.test/w/a'))).toBeUndefined();
    const long = readLinkTitle(new URL(`https://composer.test/w/a?title=${'x'.repeat(200)}`));
    expect([...(long ?? '')].length).toBe(60);
  });

  test('a $ in the title is literal', ({ expect }) => {
    const html = injectLinkPreview('<head><title>Composer</title></head>', "$& costs $'");
    expect(html).toContain('<title>$&amp; costs $&#39; | Composer</title>');
  });
});
