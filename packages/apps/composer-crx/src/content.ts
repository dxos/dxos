//
// Copyright 2024 DXOS.org
//

import { onMessage, sendMessage } from 'webext-bridge/content-script';
import browser from 'webextension-polyfill';

import { log } from '@dxos/log';

import { CLIP_ACK_EVENT, CLIP_EVENT, type Clip, type ClipAck } from './clip/types';
import { pickAndHarvest } from './picker';

/**
 * Content script — loaded on every page at document_start. Hosts the DOM
 * picker and the tab-side bridge listener.
 *
 * The popup cannot reliably await a round-trip reply because it closes when
 * the user mouses onto the page to pick. The popup fires a one-way
 * `start-picker` message; we push the finished clip to the background via
 * its own `clip` message. The background handles discovery + delivery.
 *
 * The bridge listener is declared here (rather than as a separate injected
 * script) so it ships with the content-script bundle and auto-loads on any
 * configured Composer URL. On non-Composer pages the listener simply never
 * sees a clip message — it is inert.
 */

const BRIDGE_MSG_TYPE = 'composer-crx:clip';
const PAGE_ACK_TIMEOUT_MS = 4_000;

/**
 * Tab-side bridge: receive `composer-crx:clip` messages from the background,
 * re-emit them as same-origin `composer:clip` CustomEvents the page listens
 * for, and relay the ack back.
 */
const installBridge = () => {
  browser.runtime.onMessage.addListener((msg: any): undefined | Promise<ClipAck> => {
    if (!msg || msg.type !== BRIDGE_MSG_TYPE) {
      return undefined;
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
        resolve({ ok: false, error: 'pageTimeout' } as ClipAck);
      }, PAGE_ACK_TIMEOUT_MS);

      window.dispatchEvent(new CustomEvent(CLIP_EVENT, { detail: clip }));
    });
  });
};

const main = async () => {
  log.info('content-script');

  installBridge();

  onMessage('ping', async ({ sender, data }) => {
    log.info('ping', { sender, data });
    try {
      const config = await sendMessage('config', {}, 'background');
      log.info('config', { config });
    } catch (err) {
      log.catch(err);
    }
    return window.location.href;
  });

  onMessage('start-picker', async () => {
    const clip = await pickAndHarvest();
    if (!clip) {
      return { clip: null };
    }
    try {
      await sendMessage('clip', { clip }, 'background');
    } catch (err) {
      log.catch(err);
    }
    return { clip };
  });
};

void main();
