//
// Copyright 2026 DXOS.org
//

import * as Comlink from 'comlink';
import type { Endpoint } from 'comlink';

import { PANEL_PORT_NAME, type DevtoolsHostApi } from '@dxos/composer-devtools-protocol';

/**
 * Comlink endpoint over a `chrome.runtime.Port`. Used by the devtools
 * panel and the content-script bridge.
 */
const createPortEndpoint = (port: chrome.runtime.Port): Endpoint => {
  const wrappers = new WeakMap<object, (msg: unknown) => void>();
  return {
    postMessage(data: unknown) {
      port.postMessage(data);
    },
    addEventListener(_type: string, listener: EventListenerOrEventListenerObject) {
      const wrapped = (data: unknown) => {
        const event = { data } as unknown as Event;
        if (typeof listener === 'function') {
          (listener as EventListener)(event);
        } else if (listener && typeof (listener as EventListenerObject).handleEvent === 'function') {
          (listener as EventListenerObject).handleEvent(event);
        }
      };
      wrappers.set(listener as object, wrapped);
      port.onMessage.addListener(wrapped);
    },
    removeEventListener(_type: string, listener: EventListenerOrEventListenerObject) {
      const wrapped = wrappers.get(listener as object);
      if (wrapped) {
        port.onMessage.removeListener(wrapped);
        wrappers.delete(listener as object);
      }
    },
  };
};

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
