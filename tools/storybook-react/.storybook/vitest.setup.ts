//
// Copyright 2025 DXOS.org
//

import { setProjectAnnotations } from '@storybook/react';
import { afterEach, beforeAll, beforeEach } from 'vitest';

import * as preview from './preview';

/**
 * https://storybook.js.org/docs/api/portable-stories/portable-stories-vitest#setprojectannotations
 */
const annotations = setProjectAnnotations([preview]);

// Run Storybook's beforeAll hook.
beforeAll(annotations.beforeAll);

// Clear ErrorBoundary error tracking before each test.
beforeEach(() => {
  (window as any).__ERROR_BOUNDARY_ERRORS__ = [];
});

// Detect ErrorBoundary fallback renders and fail the test.
// Uses a persistent global flag set by DefaultFallback to catch transient renders.
afterEach(() => {
  const errors: string[] = (window as any).__ERROR_BOUNDARY_ERRORS__ ?? [];
  if (errors.length > 0) {
    throw new Error(`Story rendered ErrorBoundary fallback: ${errors.join('; ')}`);
  }
});
