//
// Copyright 2024 DXOS.org
//

export type TestId = 'dx-editor' | 'dx-canvas' | 'dx-shapes' | 'dx-grid' | 'dx-background' | 'dx-overlays' | 'dx-ui';

// TODO(burdon): z-index.

export const testId = (id: TestId) => ({ 'data-test-id': id });
