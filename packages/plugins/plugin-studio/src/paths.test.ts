//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { getArtifactPath, getArtifactsPath } from './paths';

const SPACE_ID = 'B000000000000000000000000000000000';

describe('paths', () => {
  // Pins the literal path the Open operation consumes: the graph builder places artifacts as
  // children (keyed by object id) of the virtual Artifacts node under the space's Studio section,
  // and nothing else derives that composition — the navigation resolver depends on it matching.
  test('an artifact is a child of the space Studio section artifacts node', ({ expect }) => {
    expect(getArtifactsPath(SPACE_ID)).toBe(`root/${SPACE_ID}/content/studio/artifacts`);
    expect(getArtifactPath(SPACE_ID, '01ABC')).toBe(`root/${SPACE_ID}/content/studio/artifacts/01ABC`);
  });
});
