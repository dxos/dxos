//
// Copyright 2026 DXOS.org
//

import { type LoaderStore } from './store';
import { type BootLoaderApi } from './types';

/**
 * Wrap a reactive {@link LoaderStore} as the imperative `window.__bootLoader`
 * facade the host app drives. `status` / `progress` write into the store;
 * `ready` plays the graceful dismissal outro; `dismiss` is the immediate-remove
 * backstop for the fast-load path (and a no-op once an outro is already in
 * flight, so a late `dismiss()` from the framework never cuts the animation).
 */
export const createBridge = (store: LoaderStore, dismissNow: () => void): BootLoaderApi => ({
  status: (payload) => store.pushStatus(payload),
  progress: (fraction) => store.setProgress(fraction),
  ready: () => store.ready(),
  dismiss: () => {
    if (store.phase() === 'dismissing') {
      return;
    }
    dismissNow();
  },
});
