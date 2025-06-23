//
// Copyright 2023 DXOS.org
//

import { Capabilities, contributes, createIntent, defineModule, definePlugin, Events } from '@dxos/app-framework';
import { ClientEvents } from '@dxos/plugin-client';
import { MarkdownEvents } from '@dxos/plugin-markdown';
import { SpaceCapabilities } from '@dxos/plugin-space';
import { defineObjectForm } from '@dxos/plugin-space/types';

import { AnchorSort, Markdown, ReactSurface, IntentResolver, ComputeGraphRegistry } from './capabilities';
import { meta } from './meta';
import { serializer } from './serializer';
import translations from './translations';
import { SheetAction, SheetType } from './types';

export const SheetPlugin = () =>
  definePlugin(meta, [
    defineModule({
      id: `${meta.id}/module/compute-graph-registry`,
      activatesOn: ClientEvents.ClientReady,
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
            label: (object: SheetType) => object.name,
            icon: 'ph--grid-nine--regular',
            serializer,
            comments: 'anchored',
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
            objectSchema: SheetType,
            getIntent: (props, options) => createIntent(SheetAction.Create, { ...props, space: options.space }),
          }),
        ),
    }),
    defineModule({
      id: `${meta.id}/module/markdown`,
      activatesOn: MarkdownEvents.SetupExtensions,
      activate: Markdown,
    }),
    defineModule({
      id: `${meta.id}/module/anchor-sort`,
      // TODO(wittjosiah): More relevant event?
      activatesOn: Events.AppGraphReady,
      activate: AnchorSort,
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
