//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';

import { DeckOperation } from '#types';

import { handleExternalUrl } from '../url/index.ts';

const handler: Operation.WithHandler<typeof DeckOperation.HandleExternalUrl> = DeckOperation.HandleExternalUrl.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      // An external URL carries no attention of its own; the projection lands it on the chain end.
      yield* handleExternalUrl(input.url ? new URL(input.url) : undefined);
    }),
  ),
);

export default handler;
