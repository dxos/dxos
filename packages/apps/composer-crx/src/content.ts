//
// Copyright 2024 DXOS.org
//

import { onMessage, sendMessage } from 'webext-bridge/content-script';
import browser from 'webextension-polyfill';

import { log } from '@dxos/log';

import { CLIP_ACK_EVENT, CLIP_EVENT, type Clip, type ClipAck } from './clip/types';
import { DEVELOPER_MODE_PROP, getProp } from './config';
import { pickAndHarvest } from './picker';
import { showDebugPreview } from './picker/debug-preview';

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
const BACKGROUND_CLIP_MSG_TYPE = 'composer-crx:deliver-clip';
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

/**
 * Send the clip to the background worker. Uses `browser.runtime.sendMessage`
 * directly rather than webext-bridge because the popup has already closed by
 * this point and webext-bridge's routing depends on its initial connection
 * being alive — native `runtime.sendMessage` reliably reaches the service
 * worker regardless of popup lifecycle.
 */
const deliverToBackground = async (clip: Clip): Promise<void> => {
  try {
    const response = await browser.runtime.sendMessage({ type: BACKGROUND_CLIP_MSG_TYPE, clip });
    log.info('clip delivered to background', { response });
  } catch (err) {
    log.catch(err);
  }
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
      log.info('picker cancelled');
      return { clip: null };
    }

    log.info('clip harvested', { kind: clip.kind, url: clip.source.url });

    // When `developer-mode` is on, show the serialized JSON before
    // attempting delivery. Gives the user a chance to inspect (and copy)
    // the payload, and proves the picker + harvest flow independently of
    // the Composer delivery path.
    const debug = Boolean(await getProp(DEVELOPER_MODE_PROP));
    if (debug) {
      const confirmed = await showDebugPreview(clip);
      if (!confirmed) {
        log.info('clip delivery cancelled by user (debug)');
        return { clip };
      }
    }

    await deliverToBackground(clip);
    return { clip };
  });
};

void main();
