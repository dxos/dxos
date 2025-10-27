//
// Copyright 2023 DXOS.org
//

import {
  Capabilities,
  Events,
  allOf,
  contributes,
  createIntent,
  defineModule,
  definePlugin,
} from '@dxos/app-framework';
import { AutomationEvents } from '@dxos/plugin-automation';
import { ClientEvents } from '@dxos/plugin-client';
import { MarkdownEvents } from '@dxos/plugin-markdown';
import { SpaceCapabilities } from '@dxos/plugin-space';
import { defineObjectForm } from '@dxos/plugin-space/types';

import { AnchorSort, ComputeGraphRegistry, IntentResolver, Markdown, ReactSurface } from './capabilities';
import { meta } from './meta';
import { serializer } from './serializer';
import { translations } from './translations';
import { Sheet, SheetAction } from './types';

export const SheetPlugin = definePlugin(meta, () => [
  defineModule({
    id: `${meta.id}/module/compute-graph-registry`,
    activatesOn: allOf(ClientEvents.ClientReady, AutomationEvents.ComputeRuntimeReady),
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
        id: Sheet.Sheet.typename,
        metadata: {
          label: (object: Sheet.Sheet) => object.name,
          icon: 'ph--grid-nine--regular',
          iconHue: 'indigo',
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
          objectSchema: Sheet.Sheet,
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
