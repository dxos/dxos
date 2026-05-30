//
// Copyright 2026 DXOS.org
//

import browser from 'webextension-polyfill';

import { log } from '@dxos/log';

import { isComposerUrl } from '../bridge/urls';
import { renderUrl } from './render';
import { type RenderAck, RENDER_MESSAGE_TYPE, decodeRenderRequest } from './types';

/**
 * Register the background-side render-proxy listener.
 *
 * Additive to the clip flow: a separate `runtime.onMessage` handler keyed on
 * {@link RENDER_MESSAGE_TYPE} that ignores every other message. It decodes
 * the request, origin-guards the sender against the configured Composer URL
 * patterns, renders the URL in a background tab, and returns the ack.
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
};
