//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Filter, Obj } from '@dxos/echo';
import { SpecDocument } from '@dxos/types';

import { Feature, FeatureOperation, Spec, SpecText } from '#types';

import { addSpec, ensureBreakdown } from './util.ts';

const handler: Operation.WithHandler<typeof FeatureOperation.ImportSpec> = FeatureOperation.ImportSpec.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ path, text, spec: specRef, feature: featureRef, name, project }) {
      const key = { source: Feature.SPEC_KEY_SOURCE, id: Feature.getSpecPath(path) };
      // Without a target, the spec holding this path's document is imported into again rather than duplicated.
      const imported = (yield* Database.query(Filter.foreignKeys(SpecDocument.SpecDocument, [key])).run)
        .map((document) => Obj.getParent(document))
        .find(Spec.instanceOf);
      const spec = specRef
        ? yield* Database.load(specRef)
        : featureRef
          ? yield* ensureBreakdown(yield* Database.load(featureRef))
          : (imported ?? (yield* addSpec({ name: name ?? key.id, project })));

      // A target nested beneath the spec holding this path's document writes through to that document: the features
      // stay put there, so the path keeps one document. Any other target's own document takes the text and the path.
      const nested = imported !== undefined && Spec.getAncestry(spec).some((ancestor) => ancestor.id === imported.id);
      const document = yield* Database.load(nested ? imported.document : spec.document);
      if (imported && !nested) {
        const previous = yield* Database.load(imported.document);
        Obj.update(previous, (previous) => {
          const keys = Obj.getMeta(previous).keys;
          keys.splice(0, keys.length, ...keys.filter(({ source }) => source !== Feature.SPEC_KEY_SOURCE));
        });
      }

      // Named and keyed after this path, so the next import of it without a target finds this spec again.
      Obj.update(document, (document) => {
        document.name = key.id;
        const keys = Obj.getMeta(document).keys;
        const index = keys.findIndex(({ source }) => source === Feature.SPEC_KEY_SOURCE);
        if (index === -1) {
          keys.push(key);
        } else if (keys[index].id !== key.id) {
          keys.splice(index, 1, key);
        }
      });
      // The document's spec owns the features its embeds name.
      const owner = nested && imported ? imported : spec;
      const { created, updated } = yield* Effect.promise(() => SpecText.take(owner, { path, text }));
      yield* Database.flush();
      return { spec: owner.id, created, updated };
    }),
  ),
);

export default handler;
