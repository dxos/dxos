//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { cleanHtml } from './cleanHtml';

const RAW = `<!doctype html><html><head>
  <style>.x{color:red}</style>
  <script>window.x = 1;</script>
  <link rel="stylesheet" href="x.css" />
</head>
<body>
  <script>var a = 1;</script>
  <!-- a comment -->
  <div data-testid="advertCard-0" class="sc-abc" style="color:red" onclick="boom()">
    <h3 data-testid="search-listing-title">Porsche 911</h3>
    <a href="/car-details/1">view</a>
    <img src="data:image/png;base64,AAAABBBB" alt="car" />
  </div>
  <svg><path d="M0 0" /></svg>
</body></html>`;

describe('cleanHtml', () => {
  test('strips scripts/styles/svg/comments and noisy attributes; keeps structure', ({ expect }) => {
    const cleaned = cleanHtml(RAW);

    // Noise removed.
    expect(cleaned).not.toContain('<script');
    expect(cleaned).not.toContain('<style');
    expect(cleaned).not.toContain('<svg');
    expect(cleaned).not.toContain('color:red');
    expect(cleaned).not.toContain('onclick');
    expect(cleaned).not.toContain('data:image');
    expect(cleaned).not.toContain('<!--');

    // Structure the LLM needs is kept.
    expect(cleaned).toContain('data-testid="advertCard-0"');
    expect(cleaned).toContain('data-testid="search-listing-title"');
    expect(cleaned).toContain('href="/car-details/1"');
    expect(cleaned).toContain('Porsche 911');
    expect(cleaned).toContain('class="sc-abc"');
    expect(cleaned).toContain('alt="car"');
  });

  test('truncates to maxLength', ({ expect }) => {
    expect(cleanHtml(RAW, { maxLength: 20 }).length).toEqual(20);
  });
});
