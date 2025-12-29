//
// Copyright 2025 DXOS.org
//

import { Common, Plugin, Capability, createIntent } from '@dxos/app-framework';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { type CreateObjectIntent } from '@dxos/plugin-space/types';

import { meta } from '../meta';
import { Chess, ChessAction } from '../types';

const IntentResolver = Capability.lazy('IntentResolver', () => import('../capabilities/intent-resolver'));

// TODO(wittjosiah): Factor out shared modules.
export const ChessPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    id: 'schema',
    activatesOn: ClientEvents.SetupSchema,
    activate: () => Capability.contributes(ClientCapabilities.Schema, [Chess.Game]),
  }),
  Plugin.addModule({
    id: 'metadata',
    activatesOn: Common.ActivationEvent.SetupMetadata,
    activate: () =>
      Capability.contributes(Common.Capability.Metadata, {
        id: Chess.Game.typename,
        metadata: {
          createObjectIntent: (() => createIntent(ChessAction.Create)) satisfies CreateObjectIntent,
          addToCollectionOnCreate: true,
        },
      }),
  }),
  Plugin.addModule({
    id: 'intent-resolver',
    activatesOn: Common.ActivationEvent.SetupIntentResolver,
    activate: IntentResolver,
  }),
  Plugin.make,
);
