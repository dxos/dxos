// Copyright 2026 DXOS.org

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';

import { SpaceOperation } from './definitions';

const handler: Operation.WithHandler<typeof SpaceOperation.CollectGarbage> = SpaceOperation.CollectGarbage.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* () {
      const report = yield* Database.runGarbageCollection();
      return {
        unlinkedObjects: report.unlinkedObjects,
        removedDocuments: report.removedDocuments,
      };
    }),
  ),
);
export default handler;
