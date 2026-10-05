//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { FORMAT, embed, extract, isDxSvg } from './dx-svg.ts';

const SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 10 10"><rect width="10" height="10"/></svg>';

describe('dx-svg', () => {
  test('a payload round-trips through the SVG, which still renders as before', ({ expect }) => {
    const payload = {
      format: FORMAT,
      version: 1,
      objects: [
        { id: 'a', text: '<b> & </metadata> "quoted"' },
        { id: 'b', ref: { '/': 'echo:/a' } },
      ],
    };
    const svg = embed(SVG, payload);

    expect(isDxSvg(svg)).toBe(true);
    expect(extract(svg)).toEqual(payload);
    expect(svg).toContain('<rect width="10" height="10"/>');
    expect(svg).toContain(`dx:payload="${FORMAT}"`);
    // Escaped as JSON, so the payload's text cannot close the element or need entity decoding.
    expect(svg.match(/<\/metadata>/g)).toHaveLength(1);
    // One object per line, so a changed drawing diffs by object.
    expect(svg).toMatch(/\n\{"id":"a".*\},\n\{"id":"b"/);
  });

  test('a plain SVG has no payload, and a second embed is refused', ({ expect }) => {
    expect(isDxSvg(SVG)).toBe(false);
    expect(extract(SVG)).toBeUndefined();
    expect(() => embed(embed(SVG, {}), {})).toThrow(/already/);
  });

  test('an unknown encoding is an error, not a missing payload', ({ expect }) => {
    const svg = embed(SVG, { objects: [] }).replace('data-encoding="json"', 'data-encoding="deflate-raw+base64"');
    expect(() => extract(svg)).toThrow(/Unsupported/);
  });
});
