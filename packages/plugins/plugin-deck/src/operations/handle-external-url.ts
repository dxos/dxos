//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';

import { DeckOperation } from '#types';

import { handleExternalUrl } from '../url/index.ts';

const handler: Operation.WithHandler<typeof DeckOperation.HandleExternalUrl> = DeckOperation.HandleExternalUrl.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const attend = yield* handleExternalUrl(input.url ? new URL(input.url) : undefined);
      // An external URL carries no attention of its own, so it lands on the plank the chain ends with.
      if (attend) {
        yield* Operation.schedule(LayoutOperation.ScrollIntoView, { subject: attend });
      }
    }),
  ),
);

export default handler;
