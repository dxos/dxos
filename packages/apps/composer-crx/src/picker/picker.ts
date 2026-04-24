//
// Copyright 2026 DXOS.org
//

import React from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { CLIP_KINDS } from './kinds';
import { PickerOverlay } from './PickerOverlay';
import { type PickerResult } from './types';

export { type PickerResult } from './types';

const ROOT_ATTR = 'data-dxos-crx-picker';

/**
 * Start picker mode in the current tab. Mounts a React overlay inside a
 * Shadow DOM so the host page's CSS can't leak in and distort the UI.
 *
 * Idempotent — a second call while one is active returns the same promise.
 */
let active: { promise: Promise<PickerResult>; host: HTMLElement; root: Root } | null = null;

export const startPicker = (): Promise<PickerResult> => {
  if (active) {
    return active.promise;
  }

  const host = document.createElement('div');
  host.setAttribute(ROOT_ATTR, '');
  // `all: initial` + a high z-index keeps us out of the host page's CSS
  // cascade (paired with the ShadowRoot below, which is the real isolation).
  host.style.all = 'initial';
  host.style.position = 'fixed';
  host.style.inset = '0';
  host.style.pointerEvents = 'none';
  host.style.zIndex = '2147483647';

  const shadow = host.attachShadow({ mode: 'open' });
  const container = document.createElement('div');
  shadow.appendChild(container);
  document.body.appendChild(host);

  const root = createRoot(container);

  const teardown = () => {
    active = null;
    // Defer unmount to avoid React complaining about unmounting from a
    // handler it's in the middle of dispatching.
    setTimeout(() => {
      root.unmount();
      host.remove();
    }, 0);
  };

  const promise = new Promise<PickerResult>((resolve) => {
    const done = (result: PickerResult) => {
      teardown();
      resolve(result);
    };
    root.render(React.createElement(PickerOverlay, { kinds: CLIP_KINDS, hostEl: host, onResult: done }));
  });

  active = { promise, host, root };
  return promise;
};

/**
 * Test-only helper: reset the active guard so a subsequent `startPicker`
 * call creates a fresh instance. Not used in production.
 */
export const __resetPickerForTests = (): void => {
  active = null;
};
