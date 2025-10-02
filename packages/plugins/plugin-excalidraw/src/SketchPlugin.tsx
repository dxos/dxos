//
// Copyright 2023 DXOS.org
//

import { Capabilities, Events, contributes, createIntent, defineModule, definePlugin } from '@dxos/app-framework';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { CanvasType, DiagramType } from '@dxos/plugin-sketch/types';
import { SpaceCapabilities } from '@dxos/plugin-space';
import { defineObjectForm } from '@dxos/plugin-space/types';

import { ExcalidrawSettings, IntentResolvers, ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { SketchAction } from './types';

export const ExcalidrawPlugin = definePlugin(meta, () => [
  defineModule({
    id: `${meta.id}/module/settings`,
    activatesOn: Events.SetupSettings,
    activate: ExcalidrawSettings,
  }),
  defineModule({
    id: `${meta.id}/module/translations`,
    activatesOn: Events.SetupTranslations,
    activate: () => contributes(Capabilities.Translations, translations),
  }),
  defineModule({
    id: `${meta.id}/module/metadata`,
    activatesOn: Events.SetupMetadata,
    activate: () =>
      contributes(Capabilities.Metadata, {
        id: DiagramType.typename,
        metadata: {
          icon: 'ph--compass-tool--regular',
        },
      }),
  }),
  defineModule({
    id: `${meta.id}/module/object-form`,
    activatesOn: ClientEvents.SetupSchema,
    activate: () =>
      contributes(
        SpaceCapabilities.ObjectForm,
        defineObjectForm({
          objectSchema: DiagramType,
          getIntent: () => createIntent(SketchAction.Create),
        }),
      ),
  }),
  defineModule({
    id: `${meta.id}/module/schema`,
    activatesOn: ClientEvents.SetupSchema,
    activate: () => contributes(ClientCapabilities.Schema, [CanvasType]),
  }),
  defineModule({
    id: `${meta.id}/module/react-surface`,
    activatesOn: Events.SetupReactSurface,
    activate: ReactSurface,
  }),
  defineModule({
    id: `${meta.id}/module/intent-resolver`,
    activatesOn: Events.SetupIntentResolver,
    activate: IntentResolvers,
  }),
]);
