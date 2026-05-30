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
      log.info('render-page: fetched', { url, length: body.length, via: hasWindow && crxAvailable ? 'crx' : 'proxy' });
      return body;
    }),
  ),
);

export default handler;
