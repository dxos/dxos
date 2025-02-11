//
// Copyright 2023 DXOS.org
//

import {
  createIntent,
  definePlugin,
  contributes,
  Capabilities,
  Events,
  defineModule,
  oneOf,
} from '@dxos/app-framework';
import { RefArray } from '@dxos/live-object';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';

import { IntentResolver, ReactSurface } from './capabilities';
import { meta, OUTLINER_PLUGIN } from './meta';
import translations from './translations';
import { TreeItemType, TreeType, OutlinerAction } from './types';

export const OutlinerPlugin = () =>
  definePlugin(meta, [
    defineModule({
      id: `${meta.id}/module/translations`,
      activatesOn: Events.SetupTranslations,
      activate: () => contributes(Capabilities.Translations, translations),
    }),
    defineModule({
      id: `${meta.id}/module/metadata`,
      activatesOn: Events.SetupMetadata,
      activate: () => [
        contributes(Capabilities.Metadata, {
          id: TreeType.typename,
          metadata: {
            createObject: (props: { name?: string }) => createIntent(OutlinerAction.Create, props),
            placeholder: ['object placeholder', { ns: OUTLINER_PLUGIN }],
            icon: 'ph--tree-structure--regular',
            // TODO(wittjosiah): Move out of metadata.
            loadReferences: async (tree: TreeType) => await RefArray.loadAll([tree.root]),
          },
        }),
        contributes(Capabilities.Metadata, {
          id: TreeItemType.typename,
          metadata: {
            // TODO(wittjosiah): Move out of metadata.
            loadReferences: async (item: TreeItemType) => await RefArray.loadAll(item.items ?? []),
          },
        }),
      ],
    }),
    defineModule({
      id: `${meta.id}/module/schema`,
      activatesOn: ClientEvents.SetupSchema,
      activate: () => [
        contributes(ClientCapabilities.SystemSchema, [TreeItemType]),
        contributes(ClientCapabilities.Schema, [TreeType]),
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
      activate: IntentResolver,
    }),
  ]);
