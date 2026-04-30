//
// Copyright 2026 DXOS.org
//

import * as Comlink from 'comlink';

import { PANEL_PORT_NAME, type DevtoolsHostApi } from './api';
import { createPortEndpoint } from './endpoint';

/**
 * Connects from a devtools panel to the inspected page's host API.
 *
 * Opens a long-lived port to the background worker, identifies the
 * inspected tab so the router can pair us with its content script, and
 * returns a Comlink remote to the page-side host.
 */
export const connectDevtools = (
  inspectedTabId: number,
): { remote: Comlink.Remote<DevtoolsHostApi>; disconnect: () => void } => {
  const port = chrome.runtime.connect({ name: PANEL_PORT_NAME });
  port.postMessage({ __bind: inspectedTabId });

  const endpoint = createPortEndpoint(port);
  const remote = Comlink.wrap<DevtoolsHostApi>(endpoint);

  return {
    remote,
    disconnect: () => {
      try {
        port.disconnect();
      } catch {
        /* ignored */
      }
    },
  };
};

export { Comlink };
export * from './spec';
export * from './api';
