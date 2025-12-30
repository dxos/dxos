//
// Copyright 2025 DXOS.org
//

import { Capability, Common, Plugin, createIntent } from '@dxos/app-framework';
import { type CreateObjectIntent } from '@dxos/plugin-space/types';

import { meta } from '../meta';
import { Chess, ChessAction } from '../types';

const IntentResolver = Capability.lazy(
  'IntentResolver',
  () => import('../capabilities/intent-resolver/intent-resolver'),
);

// TODO(wittjosiah): Factor out shared modules.
export const ChessPlugin = Plugin.define(meta).pipe(
  Common.Plugin.addSchemaModule({ schema: [Chess.Game] }),
  Common.Plugin.addMetadataModule({
    metadata: {
      id: Chess.Game.typename,
      metadata: {
        createObjectIntent: (() => createIntent(ChessAction.Create)) satisfies CreateObjectIntent,
        addToCollectionOnCreate: true,
      },
    },
  }),
  Common.Plugin.addIntentResolverModule({ activate: IntentResolver }),
  Plugin.make,
);
