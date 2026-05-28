//
// Copyright 2025 DXOS.org
//

import * as Toolkit from '@effect/ai/Toolkit';
import * as Effect from 'effect/Effect';

import { SpaceProperties } from '@dxos/client-protocol';
import { Collection, Database, Obj, Ref, Type } from '@dxos/echo';

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
      // TODO(wittjosiah): Remove cast.
      yield* Database.add(
        Obj.make(SpaceProperties, {
          [Type.getTypename(Collection.Collection)]: Ref.make(Collection.make()),
        }) as any,
      );
    }),
    effect,
  );

export const testToolkit = Toolkit.empty as Toolkit.Toolkit<any>;
