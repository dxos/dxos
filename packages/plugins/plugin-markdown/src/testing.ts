//
// Copyright 2025 DXOS.org
//

import * as Toolkit from '@effect/ai/Toolkit';
import * as Effect from 'effect/Effect';

import { RootCollectionAnnotation } from '@dxos/app-toolkit';
import { SpaceProperties } from '@dxos/client-protocol';
import { Annotation, Collection, Database, Obj, Ref } from '@dxos/echo';

// Eager re-export of `MarkdownPlugin`. See `@dxos/plugin-testing/src/core.ts`
// for the rationale. Uses the `#plugin` subpath so the node-only build is
// re-exported in test environments, avoiding the browser-only `MarkdownPlugin.tsx`
// which references React-surface capabilities that are intentionally omitted
// from `capabilities/node.ts`.
export * from '#plugin';

// TODO(wittjosiah): Factor out.
export const WithProperties = <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R | Database.Service> =>
  Effect.zipRight(
    Effect.gen(function* () {
      const collection = Collection.make({ objects: [] });
      const properties = Obj.make(SpaceProperties, {});
      yield* Database.add(collection as any);
      yield* Database.add(properties as any);
      // Both entities are in the DB before setting the annotation so Database.load
      // works in CollectionModel.add (which uses the Effect DB context, not Ref.load).
      Obj.update(properties, (properties) => {
        const meta = Obj.getMeta(properties);
        if (!meta.annotations) {
          meta.annotations = {};
        }
        Annotation.setDictionary(meta.annotations, RootCollectionAnnotation, Ref.make(collection));
      });
    }),
    effect,
  );

export const testToolkit = Toolkit.empty as Toolkit.Toolkit<any>;
