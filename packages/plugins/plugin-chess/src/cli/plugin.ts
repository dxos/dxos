//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Common, Plugin } from '@dxos/app-framework';
import { type CreateObject } from '@dxos/plugin-space/types';

import { meta } from '../meta';
import { Chess } from '../types';

// TODO(wittjosiah): Factor out shared modules.
export const ChessPlugin = Plugin.define(meta).pipe(
  Common.Plugin.addSchemaModule({ schema: [Chess.Game] }),
  Common.Plugin.addMetadataModule({
    metadata: {
      id: Chess.Game.typename,
      metadata: {
        createObject: ((props) => Effect.sync(() => Chess.make(props))) satisfies CreateObject,
        addToCollectionOnCreate: true,
      },
    },
  }),
  Plugin.make,
);
