//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { SpaceOperation } from '@dxos/plugin-space';

import { InboxOperation } from '../../types';

import { buildContactFromActor } from './contact';

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
        hidden: true,
      });
    }),
  ),
);

export default handler;
