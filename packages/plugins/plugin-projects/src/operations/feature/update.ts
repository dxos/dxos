//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';

import { FeatureOperation } from '#types';

const handler: Operation.WithHandler<typeof FeatureOperation.Update> = FeatureOperation.Update.pipe(
  Operation.withHandler(
    Effect.fn(function* ({
      feature: featureRef,
      key,
      name,
      description,
      requirements,
      status,
      specs,
      project,
      parent,
    }) {
      const feature = yield* Database.load(featureRef);
      // Walk up from the new parent: reaching the feature means it would become its own ancestor.
      for (let ancestor = parent && (yield* Database.load(parent)); ancestor;) {
        if (ancestor.id === feature.id) {
          return yield* Effect.fail(
            new FeatureOperation.ParentCycleError({
              message: `"${feature.name}" cannot be a subfeature of its own subfeature.`,
            }),
          );
        }
        ancestor = ancestor.parent && (yield* Database.load(ancestor.parent));
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
        // A feature sits on one map, its project's or its parent's, and a position belongs to that map's canvas.
        if (project !== undefined || parent !== undefined) {
          delete feature.project;
          delete feature.parent;
          delete feature.position;
          if (parent) {
            feature.parent = parent;
          } else if (project) {
            feature.project = project;
          }
        }
      });
      yield* Database.flush();
    }),
  ),
);

export default handler;
