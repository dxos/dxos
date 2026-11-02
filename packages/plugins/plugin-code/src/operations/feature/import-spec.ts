//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import * as Spec from '@dxos/compute/Spec';
import { Database, Filter, Obj } from '@dxos/echo';

import { Feature, FeatureMap, FeatureOperation, SpecText } from '#types';

import { addSpec, ensureBreakdown } from './util.ts';

const handler: Operation.WithHandler<typeof FeatureOperation.ImportSpec> = FeatureOperation.ImportSpec.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ path, text, spec: specRef, feature: featureRef, name, project }) {
      const key = { source: Feature.SPEC_KEY_SOURCE, id: Feature.getSpecPath(path) };
      // Without a target, the spec keyed by this path is imported into again rather than duplicated.
      const imported = (yield* Database.query(Filter.foreignKeys(Spec.Spec, [key])).run).find(Spec.instanceOf);
      const spec = specRef
        ? yield* Database.load(specRef)
        : featureRef
          ? yield* ensureBreakdown(yield* Database.load(featureRef))
          : (imported ?? (yield* addSpec({ name: name ?? key.id, project })));

      // A target nested beneath the spec keyed by this path writes through to that spec's text: the features stay put
      // there, so the path keeps one spec. Any other target takes the text and the path.
      const nested =
        imported !== undefined && FeatureMap.getAncestry(spec).some((ancestor) => ancestor.id === imported.id);
      const owner = nested ? imported : spec;
      if (imported && !nested) {
        Obj.update(imported, (imported) => {
          const keys = Obj.getMeta(imported).keys;
          keys.splice(0, keys.length, ...keys.filter(({ source }) => source !== Feature.SPEC_KEY_SOURCE));
        });
      }

      // Keyed by this path, so the next import of it without a target finds this spec again.
      Obj.update(owner, (owner) => {
        const keys = Obj.getMeta(owner).keys;
        const index = keys.findIndex(({ source }) => source === Feature.SPEC_KEY_SOURCE);
        if (index === -1) {
          keys.push(key);
        } else if (keys[index].id !== key.id) {
          keys.splice(index, 1, key);
        }
      });
      const { created, updated } = yield* Effect.promise(() => SpecText.take(owner, { path, text }));
      yield* Database.flush();
      return { spec: owner.id, created, updated };
    }),
  ),
);

export default handler;
