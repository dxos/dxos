//
// Copyright 2024 DXOS.org
//

export type TestId =
  | 'dx-editor'
  | 'dx-canvas'
  | 'dx-html-content'
  | 'dx-svg-content'
  | 'dx-grid'
  | 'dx-background'
  | 'dx-overlays'
  | 'dx-ui';

export const testId = (id: TestId) => ({ 'data-test-id': id });

// TODO(burdon): z-index.
