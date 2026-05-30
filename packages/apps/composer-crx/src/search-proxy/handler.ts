//
// Copyright 2026 DXOS.org
//

import browser from 'webextension-polyfill';

import { log } from '@dxos/log';

import { isComposerUrl } from '../bridge/urls';
import { renderUrl } from './render';
import {
  type PingAck,
  type RenderAck,
  PING_MESSAGE_TYPE,
  RENDER_MESSAGE_TYPE,
  decodePingRequest,
  decodeRenderRequest,
} from './types';

/**
 * Register the background-side render-proxy listeners.
 *
 * Additive to the clip flow: separate `runtime.onMessage` handlers keyed on
 * {@link RENDER_MESSAGE_TYPE} (render a URL in a background tab) and
 * {@link PING_MESSAGE_TYPE} (identify the extension) that ignore every other
 * message. Both decode the payload and origin-guard the sender against the
 * configured Composer URL patterns before acting.
 */
export const installSearchProxy = (): void => {
  browser.runtime.onMessage.addListener(
    (message: unknown, sender: browser.Runtime.MessageSender): undefined | Promise<RenderAck> => {
      if (typeof message !== 'object' || message === null || !('type' in message)) {
        return undefined;
      }
      if (message.type !== RENDER_MESSAGE_TYPE) {
        return undefined;
      }

      const request = decodeRenderRequest('request' in message ? message.request : undefined);
      if (!request) {
        return Promise.resolve({ version: 1, id: '', ok: false, error: 'badRequest' });
      }

      return (async (): Promise<RenderAck> => {
        const origin = sender.tab?.url ?? sender.url;
        if (!(await isComposerUrl(origin))) {
          log.warn('search-proxy: rejected non-Composer origin', { origin });
          return { version: 1, id: request.id, ok: false, error: 'forbiddenOrigin' };
        }
        return renderUrl(browser, request);
      })();
    },
  );

  browser.runtime.onMessage.addListener(
    (message: unknown, sender: browser.Runtime.MessageSender): undefined | Promise<PingAck> => {
      if (typeof message !== 'object' || message === null || !('type' in message)) {
        return undefined;
      }
      if (message.type !== PING_MESSAGE_TYPE) {
        return undefined;
      }

      const request = decodePingRequest('request' in message ? message.request : undefined);
      if (!request) {
        return Promise.resolve({ version: 1, id: '', ok: false, error: 'badRequest' });
      }

      return (async (): Promise<PingAck> => {
        const origin = sender.tab?.url ?? sender.url;
        if (!(await isComposerUrl(origin))) {
          log.warn('search-proxy: rejected non-Composer ping origin', { origin });
          return { version: 1, id: request.id, ok: false, error: 'forbiddenOrigin' };
        }
        const manifest = browser.runtime.getManifest();
        return {
          version: 1,
          id: request.id,
          ok: true,
          extensionVersion: manifest.version,
          extensionName: manifest.name,
        };
      })();
    },
  );
};
