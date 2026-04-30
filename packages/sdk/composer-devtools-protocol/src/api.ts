//
// Copyright 2026 DXOS.org
//

import type { PanelInfo, SpecNode } from './spec';

/**
 * The page-side API the panel calls into via Comlink.
 *
 * Callbacks passed across the wire must be wrapped with `Comlink.proxy()`
 * by the caller. The host returns a token from `subscribe()` rather than
 * a teardown function so cleanup doesn't depend on round-tripping a proxy.
 */
export interface DevtoolsHostApi {
  /** Returns the currently-registered panels. */
  listPanels: () => Promise<PanelInfo[]>;

  /**
   * Subscribes to render output for a panel. Invokes `onChange` with the
   * current tree synchronously-ish (next microtask) and again on each
   * subsequent `panel.update()`.
   */
  subscribe: (panelId: string, onChange: (tree: SpecNode) => void) => Promise<number>;

  /** Tears down a subscription previously returned by `subscribe`. */
  unsubscribe: (subscriptionId: number) => Promise<void>;

  /**
   * Dispatches a UI event to a leaf node. `handlerId` is the `id` field
   * carried on action / input / select nodes in the spec.
   */
  dispatch: (panelId: string, handlerId: string, payload?: unknown) => Promise<void>;

  /** Subscribes to the panel list itself (added / removed). */
  subscribePanels: (onChange: (panels: PanelInfo[]) => void) => Promise<number>;
}

export const DEFAULT_CHANNEL = 'composer-devtools';

/** Event names used on `window` by the page <-> content-script CustomEvent bridge. */
export const eventNames = (channel = DEFAULT_CHANNEL) => ({
  pageToExtension: `${channel}:to-extension`,
  extensionToPage: `${channel}:to-page`,
  hello: `${channel}:hello`,
  probe: `${channel}:probe`,
});

/** Name of the long-lived `chrome.runtime.Port` used by the panel. */
export const PANEL_PORT_NAME = 'composer-devtools-panel';

/** Name of the long-lived port used by the content script. */
export const CONTENT_PORT_NAME = 'composer-devtools-content';
