//
// Copyright 2025 DXOS.org
//

import { unmountElement } from '@storybook/react-dom-shim';
import { setProjectAnnotations } from '@storybook/react-vite';
import { afterEach, beforeAll, beforeEach } from 'vitest';
import { commands } from 'vitest/browser';

import * as preview from './preview.ts';

declare module 'vitest/browser' {
  interface BrowserCommands {
    throttleCpu: () => Promise<void>;
  }
}

/**
 * https://storybook.js.org/docs/api/portable-stories/portable-stories-vitest#setprojectannotations
 */
const annotations = setProjectAnnotations([preview]);

// Run Storybook's beforeAll hook.
beforeAll(annotations.beforeAll);

beforeAll(() => commands.throttleCpu());

// Clear ErrorBoundary error tracking before each test.
beforeEach(() => {
  (window as any).__ERROR_BOUNDARY_ERRORS__ = [];
});

// Unmount the story as its test ends. Storybook unmounts it only when the next story renders, so its
// effects, timers and render loops would otherwise run on into the next test and be billed to it.
afterEach(() => {
  for (const element of Array.from(document.body.children)) {
    unmountElement(element);
  }
});

// Detect ErrorBoundary fallback renders and fail the test.
// Uses a persistent global flag set by DefaultFallback to catch transient renders.
afterEach(() => {
  const errors: string[] = (window as any).__ERROR_BOUNDARY_ERRORS__ ?? [];
  if (errors.length > 0) {
    throw new Error(`Story rendered ErrorBoundary fallback: ${errors.join('; ')}`);
  }
});
