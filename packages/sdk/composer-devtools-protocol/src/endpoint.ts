//
// Copyright 2026 DXOS.org
//

import type { Endpoint } from 'comlink';

/**
 * Comlink-compatible endpoint that travels over a pair of CustomEvents on
 * `window`. The page and the content script use mirrored channel names —
 * what one writes to, the other reads from.
 */
export const createCustomEventEndpoint = (
  outgoing: string,
  incoming: string,
  target: EventTarget = globalThis as unknown as EventTarget,
): Endpoint => {
  const wrappers = new WeakMap<object, EventListener>();
  return {
    postMessage(data: unknown) {
      target.dispatchEvent(new CustomEvent(outgoing, { detail: data }));
    },
    addEventListener(_type: string, listener: EventListenerOrEventListenerObject) {
      const wrapped: EventListener = (ev) => {
        const data = (ev as CustomEvent).detail;
        const event = { data } as unknown as Event;
        if (typeof listener === 'function') {
          (listener as EventListener)(event);
        } else if (listener && typeof (listener as EventListenerObject).handleEvent === 'function') {
          (listener as EventListenerObject).handleEvent(event);
        }
      };
      wrappers.set(listener as object, wrapped);
      target.addEventListener(incoming, wrapped);
    },
    removeEventListener(_type: string, listener: EventListenerOrEventListenerObject) {
      const wrapped = wrappers.get(listener as object);
      if (wrapped) {
        target.removeEventListener(incoming, wrapped);
        wrappers.delete(listener as object);
      }
    },
  };
};

/**
 * Comlink-compatible endpoint over a `chrome.runtime.Port`. Used between
 * the panel and the content-script bridge (relayed via the background
 * service worker per inspected tab).
 */
export const createPortEndpoint = (port: chrome.runtime.Port): Endpoint => {
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
