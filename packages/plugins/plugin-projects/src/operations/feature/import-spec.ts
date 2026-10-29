//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Filter, Obj, Ref } from '@dxos/echo';
import { SpecDocument } from '@dxos/types';

import { Feature, FeatureOperation, FeatureSpec, Spec } from '#types';

import { attach, detach, ensureBreakdown } from './util.ts';

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
          : (imported ?? (yield* Database.add(Spec.make({ name: name ?? key.id, project }))));

      // A target without a document takes over this path's existing one, so the path keeps a single document. A target
      // nested beneath that spec writes through to it instead: the features stay put there, and deleting one would take
      // a moved document with it.
      const nested = imported !== undefined && Spec.getAncestry(spec).some((ancestor) => ancestor.id === imported.id);
      if (!spec.document && imported?.document && !nested) {
        const moved = imported.document;
        Obj.update(imported, (imported) => {
          imported.document = undefined;
        });
        Obj.update(spec, (spec) => {
          spec.document = moved;
        });
      }

      // The text is the spec's document: written over the one it holds (or its ancestor's), else held as a new one.
      const held = spec.document ?? (nested ? imported?.document : undefined);
      const document = held && (yield* Database.load(held));
      if (document) {
        // Re-keyed to this path, so the next import of it without a target finds this spec again.
        Obj.update(document, (document) => {
          const keys = Obj.getMeta(document).keys;
          const index = keys.findIndex(({ source }) => source === Feature.SPEC_KEY_SOURCE);
          if (index === -1) {
            keys.push(key);
          } else if (keys[index].id !== key.id) {
            keys.splice(index, 1, key);
          }
        });
        const content = yield* Database.load(document.content);
        if (content.content !== text) {
          Obj.update(content, (content) => {
            content.content = text;
          });
        }
      } else {
        const created = SpecDocument.make({ name: key.id, content: text });
        Obj.update(created, (created) => {
          // The key a feature's spec path is matched by, so a card's spec link opens this document.
          Obj.getMeta(created).keys.push(key);
        });
        const added = yield* Database.add(created);
        Obj.update(spec, (spec) => {
          spec.document = Ref.make(added);
        });
      }

      const blocks = FeatureSpec.parse(text);
      const sources = new Set(blocks.map(({ id }) => FeatureSpec.getSource(path, id)));
      // A feature imported before is found by the block it records, wherever it has been moved to since.
      const existing = new Map<string, Feature.Feature>();
      for (const feature of (yield* Database.query(Filter.type(Feature.Feature)).run).filter(Feature.instanceOf)) {
        for (const source of feature.specs ?? []) {
          if (sources.has(source)) {
            existing.set(source, feature);
          }
        }
      }

      const created: string[] = [];
      const updated: string[] = [];
      for (const { id, name, description, requirements } of blocks) {
        const source = FeatureSpec.getSource(path, id);
        const feature = existing.get(source);
        if (feature) {
          // An explicit target takes the features its text declares, wherever they were moved to since, unless it lies
          // beneath the feature itself.
          if (specRef && Spec.getContainer(feature)?.id !== spec.id && !Spec.isWithin(spec, feature)) {
            detach(feature);
            attach(spec, feature);
          }
          // The name and description may have been rewritten by hand since; the spec owns only the requirements.
          if (JSON.stringify(feature.requirements ?? []) !== JSON.stringify(requirements)) {
            Obj.update(feature, (feature) => {
              feature.requirements = requirements;
            });
            updated.push(feature.id);
          }
          continue;
        }
        const added = yield* Database.add(
          Feature.make({ name, description, requirements, status: 'planned', specs: [source] }),
        );
        attach(spec, added);
        created.push(added.id);
      }
      yield* Database.flush();
      return { spec: spec.id, created, updated };
    }),
  ),
);

export default handler;
