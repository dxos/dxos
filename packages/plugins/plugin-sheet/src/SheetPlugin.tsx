//
// Copyright 2023 DXOS.org
//

import { Capabilities, contributes, createIntent, defineModule, definePlugin, Events } from '@dxos/app-framework';
import { FunctionType } from '@dxos/functions';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';

import { Markdown, Thread, ReactSurface, IntentResolver, ComputeGraphRegistry } from './capabilities';
import { meta, SHEET_PLUGIN } from './meta';
import { serializer } from './serializer';
import translations from './translations';
import { SheetAction, SheetType } from './types';

export const SheetPlugin = () =>
  definePlugin(meta, [
    defineModule({
      id: `${meta.id}/module/compute-graph-registry`,
      activatesOn: Events.Startup,
      activate: ComputeGraphRegistry,
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
          id: SheetType.typename,
          metadata: {
            createObject: (props: { name?: string }) => createIntent(SheetAction.Create, props),
            label: (object: any) => (object instanceof SheetType ? object.name : undefined),
            placeholder: ['sheet title placeholder', { ns: SHEET_PLUGIN }],
            icon: 'ph--grid-nine--regular',
            serializer,
          },
        }),
    }),
    defineModule({
      id: `${meta.id}/module/schema`,
      activatesOn: ClientEvents.SetupSchema,
      activate: () => [
        contributes(ClientCapabilities.Schema, [SheetType]),
        // TODO(wittjosiah): Factor out to common package/plugin.
        //  FunctionType is currently registered here in case script plugin isn't enabled.
        contributes(ClientCapabilities.SystemSchema, [FunctionType]),
      ],
    }),
    defineModule({
      id: `${meta.id}/module/markdown`,
      activatesOn: Events.Startup,
      activate: Markdown,
    }),
    defineModule({
      id: `${meta.id}/module/thread`,
      activatesOn: Events.Startup,
      activate: Thread,
    }),
    defineModule({
      id: `${meta.id}/module/react-surface`,
      activatesOn: Events.SetupSurfaces,
      activate: ReactSurface,
    }),
    defineModule({
      id: `${meta.id}/module/intent-resolver`,
      activatesOn: Events.SetupIntents,
      activate: IntentResolver,
    }),
  ]);
