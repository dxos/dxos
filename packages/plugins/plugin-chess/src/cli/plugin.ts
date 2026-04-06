//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Operation } from '@dxos/operation';
import { type CreateObject } from '@dxos/plugin-space/types';
import { SpaceOperation } from '@dxos/plugin-space/operations';

import { meta } from '../meta';
import { Chess } from '#types';

// TODO(wittjosiah): Factor out shared modules.
export const ChessPlugin = Plugin.define(meta).pipe(
  AppPlugin.addMetadataModule({
    metadata: {
      id: Chess.Game.typename,
      metadata: {
        createObject: ((props, options) =>
          Effect.gen(function* () {
            const object = Chess.make(props);
            return yield* Operation.invoke(SpaceOperation.AddObject, {
              object,
              target: options.target,
              hidden: true,
              targetNodeId: options.targetNodeId,
            });
          })) satisfies CreateObject,
      },
    },
  }),
  AppPlugin.addSchemaModule({ schema: [Chess.Game] }),
  Plugin.make,
);
