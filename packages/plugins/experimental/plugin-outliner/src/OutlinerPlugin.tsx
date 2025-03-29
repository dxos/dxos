//
// Copyright 2023 DXOS.org
//

import { createIntent, definePlugin, contributes, Capabilities, Events, defineModule } from '@dxos/app-framework';
import { RefArray } from '@dxos/live-object';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { SpaceCapabilities } from '@dxos/plugin-space';
import { defineObjectForm } from '@dxos/plugin-space/types';

import { IntentResolver, ReactSurface } from './capabilities';
import { meta, OUTLINER_PLUGIN } from './meta';
import translations from './translations';
import { TreeNodeType, TreeType, OutlinerAction } from './types';

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
            placeholder: ['object placeholder', { ns: OUTLINER_PLUGIN }],
            icon: 'ph--tree-structure--regular',
            // TODO(wittjosiah): Move out of metadata.
            loadReferences: async (tree: TreeType) => await RefArray.loadAll([tree.root]),
          },
        }),
        contributes(Capabilities.Metadata, {
          id: TreeNodeType.typename,
          metadata: {
            // TODO(wittjosiah): Move out of metadata.
            loadReferences: async (item: TreeNodeType) => await RefArray.loadAll(item.children ?? []),
          },
        }),
      ],
    }),
    defineModule({
      id: `${meta.id}/module/object-form`,
      activatesOn: ClientEvents.SetupSchema,
      activate: () =>
        contributes(
          SpaceCapabilities.ObjectForm,
          defineObjectForm({
            objectSchema: TreeType,
            getIntent: () => createIntent(OutlinerAction.Create),
          }),
        ),
    }),
    defineModule({
      id: `${meta.id}/module/schema`,
      activatesOn: ClientEvents.SetupSchema,
      activate: () => contributes(ClientCapabilities.Schema, [TreeNodeType]),
    }),
    defineModule({
      id: `${meta.id}/module/react-surface`,
      activatesOn: Events.SetupReactSurface,
      activate: ReactSurface,
    }),
    defineModule({
      id: `${meta.id}/module/intent-resolver`,
      activatesOn: Events.SetupIntentResolver,
      activate: IntentResolver,
    }),
  ]);
