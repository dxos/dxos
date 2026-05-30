//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';

import { Provider, Result, SearchOperation } from '../types';
import { type ResultData, bindRequest, deriveResultMapping, extractResults, fetchPage } from '../util';

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
        provider.kind === 'scrape' && request.method === 'GET' && provider.result.responseType === 'html'
          ? yield* Operation.invoke(SearchOperation.RenderPage, {
              url: request.url,
              waitForSelector: provider.result.responseType === 'html' ? provider.result.itemLocator : undefined,
              // Render in an (unfocused) popup window: visible enough to pass anti-bot, without
              // stealing focus from Composer.
              active: false,
            })
          : yield* fetchPage(request);
      let rows = buildResults(provider, body);

      // Self-heal: if the authored mapping extracted nothing (LLM selector mis-generalization),
      // derive a complete working mapping (container + fields) directly from the rendered DOM,
      // persist it onto the provider, and re-extract. Removes LLM selector-roulette as a blocker.
      if (rows.length === 0 && provider.result.responseType === 'html') {
        const derived = deriveResultMapping(body);
        if (derived) {
          const healed = extractResults(body, derived).filter((row) => row.title.length > 0);
          if (healed.length > 0) {
            log.info('run-provider-search: result-mapping self-heal', {
              from: provider.result.itemLocator,
              to: derived.itemLocator,
              fields: Object.keys(derived.fields).join(','),
              rows: healed.length,
            });
            Obj.update(provider, (provider) => {
              provider.result = derived;
            });
            rows = healed;
          }
        }
      }

      // Decisive extraction diagnostic (primitives so the console never truncates them): what
      // selector ran, whether the real listing markers are present, and how many rows matched.
      log.info('run-provider-search: extracted', {
        itemLocator: provider.result.itemLocator,
        rows: rows.length,
        bodyLength: body.length,
        bodyHasAdvertCard: body.includes('data-testid="advertCard-'),
        bodyHasSearchListingTitle: body.includes('data-testid="search-listing-title"'),
      });

      // Upsert by URL: reuse existing Result objects so re-runs don't duplicate listings or discard
      // user state (e.g. `starred`). Resolve the search's current results into a url -> object map.
      const existingByUrl = new Map<string, Result.Result>();
      for (const ref of search.results) {
        const existing = yield* Database.load(ref).pipe(Effect.orElseSucceed(() => undefined));
        if (existing && !existingByUrl.has(existing.url)) {
          existingByUrl.set(existing.url, existing);
        }
      }

      const now = new Date().toISOString();
      const refs: Ref.Ref<Result.Result>[] = [];
      for (const row of rows) {
        const existing = existingByUrl.get(row.url);
        if (existing) {
          // Update the snapshot in place (price/title/images can change); preserve identity + starred.
          Obj.update(existing, (existing) => {
            existing.title = row.title;
            existing.price = row.price;
            existing.currency = row.currency;
            existing.images = [...row.images];
            existing.properties = row.properties;
            existing.provider = Ref.make(provider);
            existing.fetchedAt = now;
          });
          refs.push(Ref.make(existing));
        } else {
          const persisted = yield* Database.add(
            Result.make({
              title: row.title,
              url: row.url,
              price: row.price,
              currency: row.currency,
              images: [...row.images],
              properties: row.properties,
              provider: Ref.make(provider),
              fetchedAt: now,
            }),
          );
          refs.push(Ref.make(persisted));
        }
      }
      return refs;
    }),
  ),
);

export default handler;
