//
// Copyright 2023 DXOS.org
//

import { Capability, Common, Plugin, createIntent } from '@dxos/app-framework';
import { ComputeGraph } from '@dxos/conductor';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { type CreateObjectIntent } from '@dxos/plugin-space/types';
import { CanvasBoardType } from '@dxos/react-ui-canvas-editor';

import { IntentResolver, ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { ConductorAction } from './types';

export const ConductorPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    id: 'translations',
    activatesOn: Common.ActivationEvent.SetupTranslations,
    activate: () => Capability.contributes(Common.Capability.Translations, translations),
  }),
  Plugin.addModule({
    id: 'metadata',
    activatesOn: Common.ActivationEvent.SetupMetadata,
    activate: () =>
      Capability.contributes(Common.Capability.Metadata, {
        id: CanvasBoardType.typename,
        metadata: {
          icon: 'ph--infinity--regular',
          iconHue: 'sky',
          createObjectIntent: (() => createIntent(ConductorAction.Create)) satisfies CreateObjectIntent,
          addToCollectionOnCreate: true,
        },
      }),
  }),
  Plugin.addModule({
    id: 'schema',
    activatesOn: ClientEvents.SetupSchema,
    activate: () => Capability.contributes(ClientCapabilities.Schema, [CanvasBoardType, ComputeGraph]),
  }),
  Plugin.addModule({
    id: 'react-surface',
    activatesOn: Common.ActivationEvent.SetupReactSurface,
    activate: ReactSurface,
  }),
  Plugin.addModule({
    id: 'intent-resolver',
    activatesOn: Common.ActivationEvent.SetupIntentResolver,
    activate: IntentResolver,
  }),
  Plugin.make,
);
