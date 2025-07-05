//
// Copyright 2025 DXOS.org
//

// https://github.com/testing-library/jest-dom#with-vitest
import '@testing-library/jest-dom/vitest';

// https://github.com/jsdom/jsdom/issues/3368#issuecomment-1396749033
import ResizeObserver from 'resize-observer-polyfill';

global.ResizeObserver = ResizeObserver;
