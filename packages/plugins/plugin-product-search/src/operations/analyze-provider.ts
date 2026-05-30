//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database } from '@dxos/echo';
import { log } from '@dxos/log';

import { SearchOperation } from '../types';
import { cleanHtml, fetchPage, isCrxRenderAvailable, summarizeStructure } from '../util';

// Bound the cleaned page handed to the LLM (≈ token budget). Rendered SPA pages can be multiple MB
// raw; `cleanHtml` strips scripts/styles/noise so the model sees the repeating listing structure.
// Generous cap: client-rendered listing pages put 50–100 KB of nav/filters/header before the first
// result card, so a small cap truncates the listings out of the LLM's view and it hallucinates the
// itemLocator. The model needs to actually see a few cards to author a real selector.
const MAX_BODY_LENGTH = 200_000;

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
          ? // Render in an (unfocused) popup window so the LLM authors selectors from the REAL
            // listings DOM. A separate window stays `visible` without stealing focus, getting past
            // visibility-gated anti-bot that blocks background tabs.
            yield* Operation.invoke(SearchOperation.RenderPage, { url: provider.url, active: false })
          : yield* fetchPage({ method: 'GET', url: provider.url });

      const cleaned = cleanHtml(body, { maxLength: MAX_BODY_LENGTH });
      // Distil the repeating structure from the FULL rendered DOM (not the truncated slice) so the
      // summary reflects ALL results — a strong, lossless signal for the itemLocator even though the
      // HTML slice below is truncated. Prepended so the model reads the hints first.
      const structure = summarizeStructure(body);
      const output = structure.length > 0 ? `${structure}\n\n## Page source (cleaned, truncated)\n${cleaned}` : cleaned;
      log.info('analyze-provider: fetched', {
        url: provider.url,
        rawLength: body.length,
        cleanedLength: cleaned.length,
        hasStructure: structure.length > 0,
      });
      return output;
    }),
  ),
);

export default handler;
