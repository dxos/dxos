//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { getSpace } from '@dxos/client/echo';
import { Operation } from '@dxos/compute';
import { Database, Feed, Filter, Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
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
        return 0;
      }

      const request = bindRequest({ ...search.params }, provider.request);
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

      // Append-once by URL: Results are immutable feed entries. Re-runs append only previously-unseen
      // listings (identity = url); a matched listing keeps its original snapshot, and its `starred`
      // tag (keyed by Result id on the Search) survives because the Result object is never recreated.
      const feed = yield* Database.load(search.feed);
      const space = getSpace(search);
      invariant(space, 'Search is not in a space.');
      const databaseLayer = Database.layer(space.db);
      const existing = yield* Feed.query(feed, Filter.type(Result.Result)).run.pipe(Effect.provide(databaseLayer));
      const seen = new Set(existing.map((result) => result.url));

      const now = new Date().toISOString();
      const fresh: Result.Result[] = [];
      for (const row of rows) {
        if (seen.has(row.url)) {
          continue;
        }
        seen.add(row.url);
        fresh.push(
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
      }
      if (fresh.length > 0) {
        yield* Feed.append(feed, fresh).pipe(Effect.provide(databaseLayer));
      }
      return fresh.length;
    }),
  ),
);

export default handler;
