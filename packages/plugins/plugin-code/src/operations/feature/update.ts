//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj, Text } from '@dxos/echo';

import { CodeOperation, Feature, FeatureMap, SpecText } from '#types';

import { attach, detach } from './util.ts';

const handler: Operation.WithHandler<typeof CodeOperation.UpdateFeature> = CodeOperation.UpdateFeature.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ feature: featureRef, key, name, description, requirements, status, specs, spec: specRef }) {
      const feature = yield* Database.load(featureRef);
      const target = specRef && (yield* Database.load(specRef));
      if (target && FeatureMap.isWithin(target, feature)) {
        return yield* Effect.fail(
          new CodeOperation.SpecCycleError({
            message: `"${feature.name}" cannot move into a spec that breaks it down.`,
          }),
        );
      }
      Obj.update(feature, (feature) => {
        // First, so requirements below are numbered under the block id the new sources give.
        if (specs !== undefined) {
          Feature.setSources(feature, specs);
        }
        if (key === null) {
          delete Obj.getMeta(feature).key;
        } else if (key !== undefined) {
          Obj.getMeta(feature).key = key;
        }
        // Edited in place, so comments on the name and description stay anchored.
        if (name !== undefined && name !== feature.name) {
          Text.update(feature, 'name', name);
        }
        if (description !== undefined && description !== feature.description) {
          if (typeof feature.description === 'string') {
            Text.update(feature, 'description', description);
          } else {
            feature.description = description;
          }
        }
        if (status !== undefined) {
          feature.status = status;
        }
      });
      // Edited in place, so comments on a requirement stay anchored; numbered under the block id the new sources give.
      if (requirements !== undefined) {
        Feature.setRequirements(feature, requirements, { blockId: Feature.getBlockId(feature) });
      }
      const container = FeatureMap.getContainer(feature);
      // A position belongs to the canvas it was dragged on, so a move leaves it behind; the embed moves with it.
      if (target && container?.id !== target.id) {
        if (container) {
          yield* Effect.promise(() => SpecText.unembed(container, feature.id));
        }
        detach(feature);
        attach(target, feature);
        yield* Effect.promise(() => SpecText.embed(target, feature));
      } else if (name !== undefined && container) {
        yield* Effect.promise(() => SpecText.relabel(container, feature));
      }
      yield* Database.flush();
    }),
  ),
);

export default handler;
