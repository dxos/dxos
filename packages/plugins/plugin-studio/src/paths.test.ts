//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { getArtifactPath, getArtifactsPath } from './paths.ts';

const SPACE_ID = 'B000000000000000000000000000000000';

describe('paths', () => {
  // Pins the literal path the navigation resolver must match against the graph builder's placement.
  test('an artifact is a child of the space Studio section artifacts node', ({ expect }) => {
    expect(getArtifactsPath(SPACE_ID)).toBe(`root/${SPACE_ID}/content/studio/artifacts`);
    expect(getArtifactPath(SPACE_ID, '01ABC')).toBe(`root/${SPACE_ID}/content/studio/artifacts/01ABC`);
  });
});
