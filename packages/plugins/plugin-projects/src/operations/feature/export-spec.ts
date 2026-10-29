//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';

import { FeatureOperation, SpecText } from '#types';

const handler: Operation.WithHandler<typeof FeatureOperation.ExportSpec> = FeatureOperation.ExportSpec.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ spec: specRef }) {
      const spec = yield* Database.load(specRef);
      const text = yield* Effect.promise(() => SpecText.expand(spec));
      return { text };
    }),
  ),
);

export default handler;
