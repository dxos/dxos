//
// Copyright 2026 DXOS.org
//

/**
 * @vitest-environment jsdom
 */

import { describe, test } from 'vitest';

import { harvestFavicon, harvestHints, harvestSelection } from './harvest';

describe('harvest', () => {
  test('harvestHints picks up OG + JSON-LD + first image + h1', ({ expect }) => {
    document.head.innerHTML = `
      <meta property="og:title" content="DXOS" />
      <meta property="og:description" content="Decentralized apps." />
      <meta property="og:image" content="https://dxos.org/logo.png" />
      <link rel="icon" href="https://dxos.org/favicon.ico" />
      <script type="application/ld+json">{"@type":"Organization","name":"DXOS"}</script>
    `;
    document.body.innerHTML = `
      <h1>  DXOS  </h1>
      <img src="https://dxos.org/hero.jpg" />
    `;

    const hints = harvestHints(document);
    expect(hints.ogTitle).toBe('DXOS');
    expect(hints.ogDescription).toBe('Decentralized apps.');
    expect(hints.ogImage).toBe('https://dxos.org/logo.png');
    expect(hints.h1).toBe('DXOS');
    expect(hints.firstImage).toBe('https://dxos.org/hero.jpg');
    expect(hints.jsonLd).toEqual([{ '@type': 'Organization', name: 'DXOS' }]);
  });

  test('harvestHints falls back to twitter + meta name', ({ expect }) => {
    document.head.innerHTML = `
      <meta name="twitter:title" content="Twitter title" />
      <meta name="description" content="Meta description" />
      <meta name="twitter:image" content="https://t.co/img.png" />
    `;
    document.body.innerHTML = '';

    const hints = harvestHints(document);
    expect(hints.ogTitle).toBe('Twitter title');
    expect(hints.ogDescription).toBe('Meta description');
    expect(hints.ogImage).toBe('https://t.co/img.png');
  });

  test('harvestHints tolerates malformed JSON-LD', ({ expect }) => {
    document.head.innerHTML = `
      <script type="application/ld+json">{not-json}</script>
      <script type="application/ld+json">{"@type":"Person"}</script>
    `;
    document.body.innerHTML = '';

    const hints = harvestHints(document);
    expect(hints.jsonLd).toEqual([{ '@type': 'Person' }]);
  });

  test('harvestSelection captures text + html + rect', ({ expect }) => {
    document.body.innerHTML = '<article id="card"><h2>Title</h2><p>Body text.</p></article>';
    const el = document.getElementById('card')!;
    const sel = harvestSelection(el);
    expect(sel.html).toContain('<h2>Title</h2>');
    expect(sel.html).toContain('<p>Body text.</p>');
    expect(typeof sel.text).toBe('string');
    expect(sel.rect).toBeDefined();
    expect(sel.htmlTruncated).toBeUndefined();
  });

  test('harvestFavicon returns the first recognized link rel', ({ expect }) => {
    document.head.innerHTML = `
      <link rel="shortcut icon" href="https://example.com/favicon.ico" />
    `;
    expect(harvestFavicon(document)).toBe('https://example.com/favicon.ico');

    document.head.innerHTML = '';
    expect(harvestFavicon(document)).toBeUndefined();
  });
});
