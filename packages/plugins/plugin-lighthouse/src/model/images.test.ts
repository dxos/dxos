//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { imageQueryIri, toImageRead, toImageRefs } from './images.ts';
import { toCard, visualOf } from './results.ts';

const BLOB = 'sha256:46239f642402118ce0de02baa79fb0130bf0cc922f584bed61c478efa4df7523';

describe('image search', () => {
  test('names the query node lighthouse writes for an input image', ({ expect }) => {
    expect(imageQueryIri('image-mizuno-bkk-2', BLOB)).toBe('urn:lh:image-query:image-mizuno-bkk-2/46239f642402');
    expect(toImageRefs([{ blob: BLOB, name: 'top.webp', width: 782, height: 1030 }, { name: 'no blob' }])).toEqual([
      { blob: BLOB, name: 'top.webp', width: 782, height: 1030 },
    ]);
  });

  test('reads the features, leaving out the product and any face', ({ expect }) => {
    const query = {
      id: 'q',
      types: ['lh:ImageQuery'],
      props: {
        'schema:brand': ['Mizuno'],
        'lh:itemCategory': ['long-sleeve top'],
        'lh:suggestedQuery': ['a', 'b', 'c', 'd'],
      },
    };
    const feature = (id: string, kind: string, extra: Record<string, string[]> = {}) => ({
      id,
      types: ['lh:ImageFeature'],
      props: { 'lh:featureKind': [kind], 'schema:name': [id], ...extra },
    });
    const read = toImageRead(query, [
      feature('product', 'product', { 'lh:imageBlob': ['sha256:p'] }),
      feature('face', 'face', { 'lh:imageBlob': ['sha256:f'] }),
      feature('logo', 'logo', { 'lh:imageBlob': ['sha256:l'] }),
      feature('since', 'text', { 'schema:text': ['SINCE.1906'] }),
    ]);
    expect(read).toEqual({
      title: 'Mizuno long-sleeve top',
      features: [
        { kind: 'logo', label: 'logo', crop: 'sha256:l' },
        { kind: 'text', label: '"SINCE.1906"' },
      ],
      queries: ['a', 'b', 'c'],
    });
  });

  test('shows how much a result looks like the image', ({ expect }) => {
    const entity = {
      id: 'r',
      types: ['schema:Product'],
      props: { 'schema:name': ['Top'], 'lh:visualMatch': [0.69], 'lh:matchedFeature': ['logo', 'text "SINCE.1906"'] },
    };
    expect(visualOf(entity)?.tag).toEqual({ label: 'looks 69% like your image', hue: 'amber' });
    const card = toCard(entity);
    expect(card.tags[0]?.label).toBe('looks 69% like your image');
    expect(card.rows[0]?.text).toBe('Visual match 69% · logo, text "SINCE.1906"');
    expect(visualOf({ id: 'x', types: [], props: {} })).toBeUndefined();
  });
});
