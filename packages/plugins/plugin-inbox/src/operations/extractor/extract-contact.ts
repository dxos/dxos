//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { buildContactFromActor } from '@dxos/extractor-lib';
import { SpaceOperation } from '@dxos/plugin-space';

import { InboxOperation } from '../../types';

/** @deprecated Use ExtractContactFromMessage through the ExtractMessage dispatcher instead. */
const handler: Operation.WithHandler<typeof InboxOperation.ExtractContact> = InboxOperation.ExtractContact.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ db, actor }) {
      const contact = yield* buildContactFromActor(actor, db);
      if (!contact) {
        return;
      }
      yield* Operation.invoke(SpaceOperation.AddObject, {
        object: contact,
        target: db,
      });
    }),
  ),
);

export default handler;
