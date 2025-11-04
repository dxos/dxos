//
// Copyright 2025 DXOS.org
//

import * as Toolkit from '@effect/ai/Toolkit';
import * as Effect from 'effect/Effect';

import { PropertiesType } from '@dxos/client-protocol';
import { Obj, Ref } from '@dxos/echo';
import { DatabaseService } from '@dxos/functions';
import { DataType } from '@dxos/schema';

// TODO(wittjosiah): Factor out.
export const WithProperties = <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R | DatabaseService> =>
  Effect.zipRight(
    Effect.gen(function* () {
      // TODO(wittjosiah): Remove cast.
      yield* DatabaseService.add(
        Obj.make(PropertiesType as any, {
          [DataType.Collection.typename]: Ref.make(
            Obj.make(DataType.Collection, {
              objects: [],
            }),
          ),
        }) as any,
      );
    }),
    effect,
  );

export const testToolkit = Toolkit.empty as Toolkit.Toolkit<any>;
