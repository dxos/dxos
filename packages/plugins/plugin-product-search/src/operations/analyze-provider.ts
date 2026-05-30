//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database } from '@dxos/echo';
import { log } from '@dxos/log';

import { SearchOperation } from '../types';
import { cleanHtml, fetchPage, isCrxRenderAvailable } from '../util';

// Bound the cleaned page handed to the LLM (≈ token budget). Rendered SPA pages can be multiple MB
// raw; `cleanHtml` strips scripts/styles/noise so the model sees the repeating listing structure.
const MAX_BODY_LENGTH = 64_000;

const handler: Operation.WithHandler<typeof SearchOperation.AnalyzeProvider> = SearchOperation.AnalyzeProvider.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ provider: providerRef }) {
      const provider = yield* Database.load(providerRef);
      log.info('analyze-provider: start', {
        url: provider.url,
        kind: provider.kind,
        hasWindow: typeof window !== 'undefined',
        crxAvailable: isCrxRenderAvailable(),
      });

      // Scrape targets render in a real browser: server HTML for an SPA like AutoTrader is an empty
      // shell, so the LLM needs the rendered DOM. This handler may run inside the agent spawn (no
      // DOM), so route scrape fetches through RenderPage — hosted on the main thread where the
      // extension lives. API providers (plain HTML/JSON) fetch directly via the edge proxy.
      const body =
        provider.kind === 'scrape'
          ? yield* Operation.invoke(SearchOperation.RenderPage, { url: provider.url })
          : yield* fetchPage({ method: 'GET', url: provider.url });

      const cleaned = cleanHtml(body, { maxLength: MAX_BODY_LENGTH });
      log.info('analyze-provider: fetched', { url: provider.url, rawLength: body.length, cleanedLength: cleaned.length });
      return cleaned;
    }),
  ),
);

export default handler;
