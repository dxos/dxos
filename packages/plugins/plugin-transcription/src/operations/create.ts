//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Feed, Ref } from '@dxos/echo';
import { Transcript } from '@dxos/types';

import { Create } from './definitions';

const handler: Operation.WithHandler<typeof Create> = Create.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ space }) {
      const feed = space.db.add(Feed.make());
      return {
        object: Transcript.make(Ref.make(feed)),
      };
    }),
  ),
);

export default handler;
