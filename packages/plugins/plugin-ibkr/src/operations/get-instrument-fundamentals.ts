//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database } from '@dxos/echo';

import { EdgarFetchError, EdgarTickerNotFoundError, InstrumentMissingSymbolError } from '../errors';
import { fetchEdgarFundamentals } from '../services';
import { Ibkr, IbkrOperation } from '../types';

const handler: Operation.WithHandler<typeof IbkrOperation.GetInstrumentFundamentals> =
  IbkrOperation.GetInstrumentFundamentals.pipe(
    Operation.withHandler(
      Effect.fn(function* ({ instrument: instrumentRef }) {
        const instrument = yield* Database.resolve(instrumentRef, Ibkr.Instrument);
        const symbol = instrument.symbol?.trim();
        if (!symbol) {
          return yield* Effect.fail(new InstrumentMissingSymbolError());
        }

        return yield* Effect.tryPromise({
          try: () => fetchEdgarFundamentals({ ticker: symbol }),
          catch: (cause) =>
            cause instanceof EdgarFetchError || cause instanceof EdgarTickerNotFoundError
              ? cause
              : new EdgarFetchError(cause),
        });
      }),
    ),
    Operation.opaqueHandler,
  );

export default handler;
