// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Filter } from '@dxos/echo';
import { log } from '@dxos/log';

import { SpaceOperation } from './definitions';

const handler: Operation.WithHandler<typeof SpaceOperation.Reset> = SpaceOperation.Reset.pipe(
  Operation.withHandler((input) =>
    Effect.promise(async () => {
      const { space } = input;
      const objects = await space.db.query(Filter.everything()).run();
      log.info('resetting space', { spaceId: space.id, objects: objects.length });
      for (const object of objects) {
        space.db.remove(object);
      }
      await space.db.flush();
      await space.internal.createEpoch();
    }),
  ),
);
export default handler;
