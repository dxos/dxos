//
// Copyright 2023 DXOS.org
//

import {
  createIntent,
  defineModule,
  contributes,
  Capabilities,
  Events,
  definePlugin,
  oneOf,
} from '@dxos/app-framework';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { CanvasType, DiagramType } from '@dxos/plugin-sketch/types';

import { ExcalidrawSettings, IntentResolvers, ReactSurface } from './capabilities';
import { meta, EXCALIDRAW_PLUGIN } from './meta';
import translations from './translations';
import { SketchAction } from './types';

export const ExcalidrawPlugin = () =>
  definePlugin(meta, [
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
            createObject: (props: { name?: string }) => createIntent(SketchAction.Create, props),
            placeholder: ['object title placeholder', { ns: EXCALIDRAW_PLUGIN }],
            icon: 'ph--compass-tool--regular',
          },
        }),
    }),
    defineModule({
      id: `${meta.id}/module/schema`,
      activatesOn: ClientEvents.SetupSchema,
      activate: () => [
        contributes(ClientCapabilities.SystemSchema, [CanvasType]),
        contributes(ClientCapabilities.Schema, [DiagramType]),
      ],
    }),
    defineModule({
      id: `${meta.id}/module/react-surface`,
      activatesOn: Events.SetupSurfaces,
      activate: ReactSurface,
    }),
    defineModule({
      id: `${meta.id}/module/intent-resolver`,
      activatesOn: Events.SetupIntents,
      activate: IntentResolvers,
    }),
  ]);
