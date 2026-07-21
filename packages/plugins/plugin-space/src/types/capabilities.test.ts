//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { SpaceCapabilities } from './capabilities';

describe('defaultReviewRenderPolicy', () => {
  test('default review render policy matches GDocs parity', ({ expect }) => {
    const p = SpaceCapabilities.defaultReviewRenderPolicy;
    expect(p('editing')).toEqual({ showSuggestions: true, showComments: true, editable: true });
    expect(p('suggesting')).toEqual({ showSuggestions: true, showComments: true, editable: true });
    expect(p('viewing')).toEqual({ showSuggestions: false, showComments: true, editable: false });
  });
});
