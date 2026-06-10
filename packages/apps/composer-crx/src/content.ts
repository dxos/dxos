//
// Copyright 2024 DXOS.org
//

import { onMessage, sendMessage } from 'webext-bridge/content-script';
import browser from 'webextension-polyfill';

import { log } from '@dxos/log';

import { isComposerUrl } from './bridge/urls';
import { CLIP_ACK_EVENT, CLIP_EVENT, type Clip, type ClipAck } from './clip/types';
import { DEVELOPER_MODE_PROP, getProp } from './config';
import { runExtractor } from './extractors';
import {
  PAGE_ACTIONS_LIST_ACK_EVENT,
  PAGE_ACTIONS_LIST_EVENT,
  PAGE_ACTIONS_LIST_MESSAGE_TYPE,
  PAGE_ACTIONS_PAGE_READY_EVENT,
  PAGE_ACTIONS_READY_MESSAGE_TYPE,
  PAGE_ACTION_EXTRACT_MESSAGE_TYPE,
  PAGE_ACTION_INVOKE_ACK_EVENT,
  PAGE_ACTION_INVOKE_EVENT,
  PAGE_ACTION_INVOKE_MESSAGE_TYPE,
  PAGE_ACTION_PREDICATE_MESSAGE_TYPE,
  decodeInvokeAck,
  decodeListAck,
} from './page-actions';
import { pickAndHarvest } from './picker';
import { showDebugPreview } from './picker/debug-preview';
import {
  type PingAck,
  type RenderAck,
  PING_ACK_EVENT,
  PING_EVENT,
  PING_MESSAGE_TYPE,
  RENDER_ACK_EVENT,
  RENDER_EVENT,
  RENDER_MESSAGE_TYPE,
  RENDER_READY_DATASET_KEY,
  decodePingAck,
  decodePingRequest,
  decodeRenderAck,
  decodeRenderRequest,
} from './search-proxy';

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
 * All-pages handlers: run a bundled extractor / evaluate a DOM predicate on
 * behalf of the background worker or popup.
 */
const installPageActionHelpers = () => {
  browser.runtime.onMessage.addListener((msg: any): undefined | Promise<unknown> => {
    if (!msg || msg.type !== PAGE_ACTION_EXTRACT_MESSAGE_TYPE) {
      return undefined;
    }
    if (typeof msg.name !== 'string') {
      return Promise.resolve({ ok: false, error: 'badRequest' });
    }
    return runExtractor(msg.name, { document, params: msg.params })
      .then((inputs) => ({ ok: true, inputs }))
      .catch((err) => ({ ok: false, error: err instanceof Error ? err.message : 'extractorFailed' }));
  });

  browser.runtime.onMessage.addListener((msg: any): undefined | Promise<unknown> => {
    if (!msg || msg.type !== PAGE_ACTION_PREDICATE_MESSAGE_TYPE) {
      return undefined;
    }
    if (typeof msg.exists !== 'string') {
      return Promise.resolve({ ok: true, matches: false });
    }
    try {
      return Promise.resolve({ ok: true, matches: !!document.querySelector(msg.exists) });
    } catch {
      return Promise.resolve({ ok: true, matches: false });
    }
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

/**
 * Re-emit a render ack as a same-origin CustomEvent the page listens for.
 */
const emitRenderAck = (ack: RenderAck): void => {
  window.dispatchEvent(new CustomEvent(RENDER_ACK_EVENT, { detail: ack }));
};

/**
 * Re-emit a ping ack as a same-origin CustomEvent the page listens for.
 */
const emitPingAck = (ack: PingAck): void => {
  window.dispatchEvent(new CustomEvent(PING_ACK_EVENT, { detail: ack }));
};

/**
 * Page-side relay for the search render-proxy. Installed only on Composer
 * origins: listen for the page's `composer:search-proxy:render` CustomEvent,
 * validate it, forward it to the background worker, and re-emit the decoded
 * ack as `composer:search-proxy:render:ack` (correlated by `id`).
 *
 * On non-Composer pages the relay is never installed, so the page's events
 * are inert.
 */
const installSearchProxyRelay = async (): Promise<void> => {
  if (!(await isComposerUrl(window.location.href))) {
    return;
  }

  // Advertise availability so the page can route to the render-proxy without a timeout probe.
  document.documentElement.dataset[RENDER_READY_DATASET_KEY] = '1';

  window.addEventListener(RENDER_EVENT, (event: Event) => {
    // `CustomEvent#detail` is not typed for an arbitrary event name; read it
    // via a structural guard rather than casting, then decode/validate.
    const detail = 'detail' in event ? event.detail : undefined;
    const request = decodeRenderRequest(detail);
    if (!request) {
      log.warn('search-proxy relay: ignoring malformed render request');
      return;
    }

    void (async () => {
      try {
        const response = await browser.runtime.sendMessage({ type: RENDER_MESSAGE_TYPE, request });
        const ack = decodeRenderAck(response);
        if (ack) {
          emitRenderAck(ack);
        } else {
          emitRenderAck({ version: 1, id: request.id, ok: false, error: 'invalidAck' });
        }
      } catch (err) {
        log.catch(err);
        emitRenderAck({ version: 1, id: request.id, ok: false, error: 'transportError' });
      }
    })();
  });

  window.addEventListener(PING_EVENT, (event: Event) => {
    const detail = 'detail' in event ? event.detail : undefined;
    const request = decodePingRequest(detail);
    if (!request) {
      log.warn('search-proxy relay: ignoring malformed ping request');
      return;
    }

    void (async () => {
      try {
        const response = await browser.runtime.sendMessage({ type: PING_MESSAGE_TYPE, request });
        const ack = decodePingAck(response);
        if (ack) {
          emitPingAck(ack);
        } else {
          emitPingAck({ version: 1, id: request.id, ok: false, error: 'invalidAck' });
        }
      } catch (err) {
        log.catch(err);
        emitPingAck({ version: 1, id: request.id, ok: false, error: 'transportError' });
      }
    })();
  });
};

const PAGE_ACTION_ACK_TIMEOUT_MS = 8_000;

/**
 * Composer-tab relay: forward a background request to the page as a
 * CustomEvent and resolve with the page's correlated ack. An ack with an
 * empty id is also accepted — the page acks undecodable payloads with
 * `id: ''` and dropping those would turn a reportable error into a timeout.
 */
const requestFromPage = <T extends { id: string }>(
  requestEvent: string,
  ackEvent: string,
  request: { id: string },
  decode: (detail: unknown) => T | undefined,
  timeoutAck: T,
): Promise<T> =>
  new Promise<T>((resolve) => {
    let settled = false;
    const onAck = (ev: Event) => {
      const ack = decode((ev as CustomEvent).detail);
      if (settled || !ack || (ack.id !== request.id && ack.id !== '')) {
        return;
      }
      settled = true;
      window.removeEventListener(ackEvent, onAck);
      resolve(ack);
    };
    window.addEventListener(ackEvent, onAck);
    setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      window.removeEventListener(ackEvent, onAck);
      resolve(timeoutAck);
    }, PAGE_ACTION_ACK_TIMEOUT_MS);
    window.dispatchEvent(new CustomEvent(requestEvent, { detail: request }));
  });

/**
 * Composer-pages relay for the page-actions bridge. Notifies the background
 * when ready so it can refresh its registry cache.
 */
const installPageActionsRelay = async (): Promise<void> => {
  if (!(await isComposerUrl(window.location.href))) {
    return;
  }

  browser.runtime.onMessage.addListener((msg: any): undefined | Promise<unknown> => {
    if (!msg || msg.type !== PAGE_ACTIONS_LIST_MESSAGE_TYPE) {
      return undefined;
    }
    const request = typeof msg.request?.id === 'string' ? msg.request : { id: '' };
    return requestFromPage(PAGE_ACTIONS_LIST_EVENT, PAGE_ACTIONS_LIST_ACK_EVENT, request, decodeListAck, {
      version: 1,
      id: request.id,
      ok: false,
      error: 'timeout',
    });
  });

  browser.runtime.onMessage.addListener((msg: any): undefined | Promise<unknown> => {
    if (!msg || msg.type !== PAGE_ACTION_INVOKE_MESSAGE_TYPE) {
      return undefined;
    }
    const request = typeof msg.request?.id === 'string' ? msg.request : { id: '' };
    return requestFromPage(PAGE_ACTION_INVOKE_EVENT, PAGE_ACTION_INVOKE_ACK_EVENT, request, decodeInvokeAck, {
      version: 1,
      id: request.id,
      ok: false,
      error: 'timeout',
    });
  });

  // Fallback: send ready immediately for pages that were already booted when
  // the content script installed (e.g. extension updated while tab was open).
  browser.runtime.sendMessage({ type: PAGE_ACTIONS_READY_MESSAGE_TYPE }).catch((err: unknown) => log.catch(err));

  // Also listen for the page's own ready announce so we catch the common case
  // where Composer boots seconds after document_start (React app initialising,
  // plugin activation).
  window.addEventListener(PAGE_ACTIONS_PAGE_READY_EVENT, () => {
    browser.runtime.sendMessage({ type: PAGE_ACTIONS_READY_MESSAGE_TYPE }).catch((err: unknown) => log.catch(err));
  });
};

const main = async () => {
  log.info('content-script');

  installBridge();
  installPageActionHelpers();
  void installSearchProxyRelay();
  void installPageActionsRelay();

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
