//
// Copyright 2026 DXOS.org
//

// Injected by `chrome.scripting.executeScript` into the Composer tab.
// Listens for an internal extension message, dispatches a same-origin
// CustomEvent the page's `@dxos/plugin-crx-bridge` listens for, then awaits
// the ack event and returns it to the extension.

import browser from 'webextension-polyfill';

import { CLIP_ACK_EVENT, CLIP_EVENT, type Clip, type ClipAck } from '../clip/types';

const GUARD = '__dxosComposerBridge';
const BRIDGE_MSG_TYPE = 'composer-crx:clip';
const PAGE_ACK_TIMEOUT_MS = 4_000;

const ensureListener = () => {
  if ((window as any)[GUARD]) {
    return;
  }
  (window as any)[GUARD] = true;

  // `browser.runtime.onMessage` requires the listener to return `true` (or a
  // Promise) when it intends to respond asynchronously. For non-clip messages
  // we respond synchronously with `undefined`; returning a resolved promise
  // satisfies webextension-polyfill's typing while preserving semantics.
  browser.runtime.onMessage.addListener((msg: any): true | Promise<ClipAck> => {
    if (!msg || msg.type !== BRIDGE_MSG_TYPE) {
      return Promise.resolve({ ok: false, error: 'ignored' } as ClipAck) as any;
    }
    const clip = msg.clip as Clip;

    return new Promise<ClipAck>((resolve) => {
      let settled = false;
      const onAck = (ev: Event) => {
        if (settled) {
          return;
        }
        settled = true;
        window.removeEventListener(CLIP_ACK_EVENT, onAck);
        resolve((ev as CustomEvent).detail as ClipAck);
      };
      window.addEventListener(CLIP_ACK_EVENT, onAck);

      setTimeout(() => {
        if (settled) {
          return;
        }
        settled = true;
        window.removeEventListener(CLIP_ACK_EVENT, onAck);
        resolve({ ok: false, error: 'page-timeout' } as ClipAck);
      }, PAGE_ACK_TIMEOUT_MS);

      window.dispatchEvent(new CustomEvent(CLIP_EVENT, { detail: clip }));
    });
  });
};

ensureListener();
