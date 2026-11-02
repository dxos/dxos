//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';

import { FeatureOperation, Spec } from '#types';

import { attach, detach } from './util.ts';

const handler: Operation.WithHandler<typeof FeatureOperation.Update> = FeatureOperation.Update.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ feature: featureRef, key, name, description, requirements, status, specs, spec: specRef }) {
      const feature = yield* Database.load(featureRef);
      const target = specRef && (yield* Database.load(specRef));
      if (target && Spec.isWithin(target, feature)) {
        return yield* Effect.fail(
          new FeatureOperation.SpecCycleError({
            message: `"${feature.name}" cannot move into a spec that breaks it down.`,
          }),
        );
      }
      Obj.update(feature, (feature) => {
        if (key === null) {
          delete Obj.getMeta(feature).key;
        } else if (key !== undefined) {
          Obj.getMeta(feature).key = key;
        }
        if (name !== undefined) {
          feature.name = name;
        }
        if (description !== undefined) {
          feature.description = description;
        }
        if (requirements !== undefined) {
          feature.requirements = requirements.map((requirement) => ({ ...requirement }));
        }
        if (status !== undefined) {
          feature.status = status;
        }
        if (specs !== undefined) {
          feature.specs = [...specs];
        }
      });
      // A position belongs to the canvas it was dragged on, so a move leaves it behind.
      if (target && Spec.getContainer(feature)?.id !== target.id) {
        detach(feature);
        attach(target, feature);
      }
      yield* Database.flush();
    }),
  ),
);

export default handler;
