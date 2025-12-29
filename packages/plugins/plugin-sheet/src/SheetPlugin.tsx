//
// Copyright 2023 DXOS.org
//

import { ActivationEvent, Capability, Common, Plugin, createIntent } from '@dxos/app-framework';
import { AutomationEvents } from '@dxos/plugin-automation';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { MarkdownEvents } from '@dxos/plugin-markdown';
import { type CreateObjectIntent } from '@dxos/plugin-space/types';

import { AnchorSort, ComputeGraphRegistry, IntentResolver, Markdown, ReactSurface } from './capabilities';
import { meta } from './meta';
import { serializer } from './serializer';
import { translations } from './translations';
import { Sheet, SheetAction } from './types';

export const SheetPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    id: 'compute-graph-registry',
    activatesOn: ActivationEvent.allOf(ClientEvents.ClientReady, AutomationEvents.ComputeRuntimeReady),
    activate: ComputeGraphRegistry,
  }),
  Common.Plugin.addTranslationsModule({ translations }),
  Common.Plugin.addMetadataModule({
    metadata: {
      id: Sheet.Sheet.typename,
      metadata: {
        label: (object: Sheet.Sheet) => object.name,
        icon: 'ph--grid-nine--regular',
        iconHue: 'indigo',
        serializer,
        comments: 'anchored',
        createObjectIntent: ((props) => createIntent(SheetAction.Create, { ...props })) satisfies CreateObjectIntent,
        addToCollectionOnCreate: true,
      },
    },
  }),
  Plugin.addModule({
    id: 'schema',
    activatesOn: ClientEvents.SetupSchema,
    activate: () => Capability.contributes(ClientCapabilities.Schema, [Sheet.Sheet]),
  }),
  Plugin.addModule({
    id: 'markdown',
    activatesOn: MarkdownEvents.SetupExtensions,
    activate: Markdown,
  }),
  Plugin.addModule({
    id: 'anchor-sort',
    // TODO(wittjosiah): More relevant event?
    activatesOn: Common.ActivationEvent.AppGraphReady,
    activate: AnchorSort,
  }),
  Common.Plugin.addSurfaceModule({ activate: ReactSurface }),
  Common.Plugin.addIntentResolverModule({ activate: IntentResolver }),
  Plugin.make,
);
