//
// Copyright 2026 DXOS.org
//

import { createEffect } from 'solid-js';
import { render } from 'solid-js/web';

import { createBridge } from './bridge';
import { Loader } from './Loader';
import { createLoaderStore } from './store';
import { type BootLoaderConfig } from './types';

/** Fallback teardown if the outro's `transitionend` never fires (e.g. no opacity transition). */
const OUTRO_FALLBACK_MS = 800;

/**
 * Mount the boot loader into a host element (`#boot-loader`, the static backdrop
 * the plugin injects — or any container in the storybook) and install the
 * `window.__bootLoader` facade. Renders the disc + status into the host, toggles
 * `data-dismissing` on it for the outro, and removes everything once the outro
 * completes.
 *
 * Returns a disposer that tears the loader down immediately (idempotent).
 */
export const mountLoader = (el: HTMLElement, config: BootLoaderConfig = {}): (() => void) => {
  const store = createLoaderStore(config.status);

  let removed = false;
  // Forward-declared so `remove` can dispose the Solid render created below.
  let disposeRender: (() => void) | undefined;

  const remove = (): void => {
    if (removed) {
      return;
    }
    removed = true;
    el.removeEventListener('transitionend', handleTransitionEnd);
    store.dispose();
    disposeRender?.();
    el.remove();
    if (window.__bootLoader === api) {
      delete window.__bootLoader;
    }
  };

  const handleTransitionEnd = (event: TransitionEvent): void => {
    if (event.propertyName === 'opacity' && store.phase() === 'dismissing') {
      remove();
    }
  };
  el.addEventListener('transitionend', handleTransitionEnd);

  disposeRender = render(() => {
    // Drive the backdrop's outro from the host element (Solid owns the host's
    // children; the host attribute is toggled imperatively within this owner).
    createEffect(() => {
      const dismissing = store.phase() === 'dismissing';
      el.toggleAttribute('data-dismissing', dismissing);
      if (dismissing) {
        setTimeout(remove, OUTRO_FALLBACK_MS);
      }
    });
    return <Loader store={store} markSvg={config.markSvg} />;
  }, el);

  const api = createBridge(store, remove);
  window.__bootLoader = api;

  return remove;
};
