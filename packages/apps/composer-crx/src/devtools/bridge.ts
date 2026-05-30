//
// Copyright 2026 DXOS.org
//

import { CONTENT_PORT_NAME, DEFAULT_CHANNEL, PANEL_PORT_NAME, eventNames } from '@dxos/composer-devtools-protocol';

type BindMessage = { __bind: number };

const installedBridges = new Set<string>();
let routerInstalled = false;

/**
 * Content-script side of the bridge. Relays messages between the page
 * (CustomEvents on `window`) and the panel (a long-lived
 * `chrome.runtime.Port` to the background worker).
 *
 * Call once from a content script that runs at `document_start` on pages
 * the devtools panel should be able to inspect. Idempotent per channel.
 */
export const installDevtoolsBridge = (channel = DEFAULT_CHANNEL): void => {
  if (installedBridges.has(channel)) {
    return;
  }
  installedBridges.add(channel);

  const names = eventNames(channel);

  // Connect to the background; the background pairs us with any panel
  // currently inspecting this tab.
  let port: chrome.runtime.Port | undefined;

  const connect = () => {
    const next = chrome.runtime.connect({ name: CONTENT_PORT_NAME });
    next.onMessage.addListener((data: unknown) => {
      window.dispatchEvent(new CustomEvent(names.extensionToPage, { detail: data }));
    });
    next.onDisconnect.addListener(() => {
      if (port === next) {
        port = undefined;
      }
    });
    port = next;
  };
  connect();

  window.addEventListener(names.pageToExtension, (ev) => {
    const detail = (ev as CustomEvent).detail;
    if (!port) {
      connect();
    }
    try {
      port?.postMessage(detail);
    } catch {
      // Port closed between checks (extension reload). Reconnect and retry once.
      connect();
      port?.postMessage(detail);
    }
  });

  // Probe the page in case it loaded before us.
  window.dispatchEvent(new CustomEvent(names.probe));
  // Forward `hello` announces so the background can know the page is ready.
  window.addEventListener(names.hello, () => {
    try {
      port?.postMessage({ __devtools: 'hello' });
    } catch {
      /* ignored */
    }
  });
};

/**
 * Background-worker side of the bridge. Pairs content-script ports with
 * panel ports per inspected tab so messages flow end-to-end.
 *
 * Call once from the extension's background service worker. Idempotent.
 */
export const installDevtoolsRouter = (): void => {
  if (routerInstalled) {
    return;
  }
  routerInstalled = true;

  type Pair = { content?: chrome.runtime.Port; panel?: chrome.runtime.Port };
  const pairs = new Map<number, Pair>();

  const ensurePair = (tabId: number): Pair => {
    let pair = pairs.get(tabId);
    if (!pair) {
      pair = {};
      pairs.set(tabId, pair);
    }
    return pair;
  };

  chrome.runtime.onConnect.addListener((port: chrome.runtime.Port) => {
    if (port.name === CONTENT_PORT_NAME) {
      const tabId = port.sender?.tab?.id;
      if (typeof tabId !== 'number') {
        return;
      }
      const pair = ensurePair(tabId);
      pair.content = port;
      port.onMessage.addListener((msg) => pair.panel?.postMessage(msg));
      port.onDisconnect.addListener(() => {
        // Only clear if a newer port hasn't reconnected and replaced us.
        if (pair.content === port) {
          pair.content = undefined;
        }
        if (!pair.content && !pair.panel) {
          pairs.delete(tabId);
        }
      });
    } else if (port.name === PANEL_PORT_NAME) {
      // The panel posts its target tabId in the first message because
      // `port.sender.tab` is undefined for devtools-page connections.
      let tabId: number | undefined;
      port.onMessage.addListener((msg: BindMessage | unknown) => {
        if (tabId === undefined && msg && typeof (msg as BindMessage).__bind === 'number') {
          const bound = (msg as BindMessage).__bind;
          tabId = bound;
          const pair = ensurePair(bound);
          pair.panel = port;
          return;
        }
        if (tabId !== undefined) {
          pairs.get(tabId)?.content?.postMessage(msg);
        }
      });
      port.onDisconnect.addListener(() => {
        if (tabId !== undefined) {
          const pair = pairs.get(tabId);
          if (pair) {
            if (pair.panel === port) {
              pair.panel = undefined;
            }
            if (!pair.content && !pair.panel) {
              pairs.delete(tabId);
            }
          }
        }
      });
    }
  });
};
