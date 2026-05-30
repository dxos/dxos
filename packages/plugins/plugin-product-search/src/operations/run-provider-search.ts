//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Ref } from '@dxos/echo';
import { log } from '@dxos/log';

import { Provider, Result, SearchOperation } from '../types';
import { type ResultData, bindRequest, extractResults, fetchPage } from '../util';

/** Pure: given a fully-configured provider and a response body, produce result data. */
export const buildResults = (provider: Provider.Provider, body: string): ResultData[] => {
  if (!provider.result) {
    return [];
  }
  return extractResults(body, provider.result);
};

const handler: Operation.WithHandler<typeof SearchOperation.RunProviderSearch> = SearchOperation.RunProviderSearch.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ search: searchRef, provider: providerRef }) {
      const search = yield* Database.load(searchRef);
      const provider = yield* Database.load(providerRef);
      if (!provider.request || !provider.result) {
        return [];
      }

      const request = bindRequest({ ...search.criteria }, provider.request);
      // Scrape targets render in a real browser via RenderPage (hosted where the extension lives),
      // waiting for the listing selector so client-rendered results are in the DOM before reading.
      // API providers (GET/POST against an endpoint) fetch directly through the edge proxy.
      const body =
        provider.kind === 'scrape' && request.method === 'GET'
          ? yield* Operation.invoke(SearchOperation.RenderPage, {
              url: request.url,
              waitForSelector: provider.result.responseType === 'html' ? provider.result.itemLocator : undefined,
              // Render in an (unfocused) popup window: visible enough to pass anti-bot, without
              // stealing focus from Composer.
              active: false,
            })
          : yield* fetchPage(request);
      const rows = buildResults(provider, body);
      // Decisive extraction diagnostic (primitives so the console never truncates them): what
      // selector ran, whether the real listing markers are present, and how many rows matched.
      log.info('run-provider-search: extracted', {
        itemLocator: provider.result.itemLocator,
        rows: rows.length,
        bodyLength: body.length,
        bodyHasAdvertCard: body.includes('data-testid="advertCard-'),
        bodyHasSearchListingTitle: body.includes('data-testid="search-listing-title"'),
      });

      const refs: Ref.Ref<Result.Result>[] = [];
      for (const row of rows) {
        const result = Result.make({
          title: row.title,
          url: row.url,
          price: row.price,
          currency: row.currency,
          images: [...row.images],
          properties: row.properties,
          provider: Ref.make(provider),
          fetchedAt: new Date().toISOString(),
        });
        const persisted = yield* Database.add(result);
        refs.push(Ref.make(persisted));
      }
      return refs;
    }),
  ),
);

export default handler;
