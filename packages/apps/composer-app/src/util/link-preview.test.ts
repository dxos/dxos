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

  test('an image makes the preview a large card', ({ expect }) => {
    const html = injectLinkPreview('<head><title>Composer</title></head>', 'Plan', {
      image: 'https://view.composer.test/publications/abc/preview.png?object=01A&x=1',
    });
    expect(html).toContain(
      '<meta property="og:image" content="https://view.composer.test/publications/abc/preview.png?object=01A&amp;x=1" />',
    );
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image" />');
    expect(injectLinkPreview('<head></head>', 'Plan')).toContain('<meta name="twitter:card" content="summary" />');
  });
});
