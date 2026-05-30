//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { log } from '@dxos/log';

import { SearchOperation } from '../types';
import { fetchPage, isCrxRenderAvailable } from '../util';

/**
 * Render bridge handler. Runs in the plugin's (main-thread) operation host, where `window` and the
 * composer-crx relay exist, so `fetchPage` can drive the extension's render-proxy. Callers inside
 * the agent spawn (no DOM) reach it via the operation bus.
 */
const handler: Operation.WithHandler<typeof SearchOperation.RenderPage> = SearchOperation.RenderPage.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ url, waitForSelector }) {
      const hasWindow = typeof window !== 'undefined';
      const crxAvailable = isCrxRenderAvailable();
      log.info('render-page: context', { url, hasWindow, crxAvailable, waitForSelector });

      const body = yield* fetchPage({ method: 'GET', url }, { render: true, waitForSelector });

      // Diagnostics: what actually rendered? Reveals consent/anti-bot interstitials vs real listings,
      // and the data-testid vocabulary present (so a wrong itemLocator is obvious).
      const lower = body.toLowerCase();
      const title = body.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim().slice(0, 100);
      const testIds = [...new Set([...body.matchAll(/data-testid="([^"]+)"/g)].map((match) => match[1]))].slice(0, 25);
      log.info('render-page: fetched', {
        url,
        length: body.length,
        via: hasWindow && crxAvailable ? 'crx' : 'proxy',
        title,
        looksLikeChallenge: /just a moment|are you a robot|px-captcha|datadome|\/cdn-cgi\/challenge|enable javascript/.test(lower),
        looksLikeConsent: /onetrust|sourcepoint|sp_message|accept all cookies|manage consent/.test(lower),
        testIds,
      });
      return body;
    }),
  ),
);

export default handler;
