//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Credential from '@dxos/compute/Credential';
import * as Operation from '@dxos/compute/Operation';
import { Feed, Obj } from '@dxos/echo';

import { Ibkr, IbkrOperation } from '#types';

import { IBKR_SOURCE } from '../constants.ts';
import { IbkrConnectionError, IbkrSyncError } from '../errors.ts';
import { fetchFlexReportXml, parseCash, parsePositions, parseTrades } from '../services/index.ts';
import { getOrCreatePortfolioFeed } from './feed.ts';

const getCredential = Effect.gen(function* () {
  const credential = yield* Credential.CredentialsService.getCredential({ service: IBKR_SOURCE });
  const token = credential.apiKey;
  const queryId = credential.account;
  if (!token || !queryId) {
    return yield* Effect.fail(new IbkrConnectionError());
  }
  return { token, queryId };
});

const handler: Operation.WithHandler<typeof IbkrOperation.SyncPortfolioReport> = IbkrOperation.SyncPortfolioReport.pipe(
  Operation.withHandler(
    Effect.fn(function* () {
      const { token, queryId } = yield* getCredential;
      const xml = yield* Effect.tryPromise({
        try: () => fetchFlexReportXml({ token, queryId }),
        catch: (cause) => new IbkrSyncError(cause),
      });
      const fetchedAt = new Date().toISOString();
      const feed = yield* getOrCreatePortfolioFeed;
      yield* Feed.append(feed, [Obj.make(Ibkr.Report, { xml, fetchedAt })]);
      return {
        fetchedAt,
        positions: parsePositions(xml).length,
        trades: parseTrades(xml).length,
        cash: parseCash(xml).length,
      };
    }),
  ),
  Operation.opaqueHandler,
);

export default handler;
