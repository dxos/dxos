//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';

import { FeatureOperation, Spec, SpecText } from '#types';

import { detach } from './util.ts';

const handler: Operation.WithHandler<typeof FeatureOperation.Delete> = FeatureOperation.Delete.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ feature: featureRef }) {
      const feature = yield* Database.load(featureRef);
      const container = Spec.getContainer(feature);
      if (container) {
        yield* Effect.promise(() => SpecText.unembed(container, feature.id));
      }
      detach(feature);
      // Its breakdown spec is an owned child, so it and its features go with it.
      yield* Database.remove(feature);
      yield* Database.flush();
    }),
  ),
);

export default handler;
