//
// Copyright 2026 DXOS.org
//

import type { Endpoint } from 'comlink';

/**
 * Comlink-compatible endpoint that travels over a pair of CustomEvents on
 * `window`. The page-side host uses this to expose its API; the content
 * script bridges these events out to the extension.
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
