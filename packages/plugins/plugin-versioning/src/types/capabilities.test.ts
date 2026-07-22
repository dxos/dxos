//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { VersioningCapabilities } from './capabilities';

describe('defaultReviewRenderPolicy', () => {
  test('default review render policy matches GDocs parity', ({ expect }) => {
    const policy = VersioningCapabilities.defaultReviewRenderPolicy;
    expect(policy('editing')).toEqual({ showSuggestions: true, showComments: true, editable: true });
    expect(policy('suggesting')).toEqual({ showSuggestions: true, showComments: true, editable: true });
    expect(policy('viewing')).toEqual({ showSuggestions: false, showComments: true, editable: false });
  });
});
