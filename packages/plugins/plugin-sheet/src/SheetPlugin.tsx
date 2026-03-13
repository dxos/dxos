//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';

import { ActivationEvent, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { AutomationEvents } from '@dxos/plugin-automation';
import { ClientEvents } from '@dxos/plugin-client';
import { MarkdownEvents } from '@dxos/plugin-markdown';
import { type CreateObject } from '@dxos/plugin-space/types';

import { AnchorSort, ComputeGraphRegistry, Markdown, OperationResolver, ReactSurface } from './capabilities';
import { meta } from './meta';
import { serializer } from './serializer';
import { translations } from './translations';
import { Sheet } from './types';

export const SheetPlugin = Plugin.define(meta).pipe(
  AppPlugin.addMetadataModule({
    metadata: {
      id: Sheet.Sheet.typename,
      metadata: {
        label: (object: Sheet.Sheet) => object.name,
        icon: 'ph--grid-nine--regular',
        iconHue: 'indigo',
        serializer,
        comments: 'anchored',
        createObject: ((props) => Effect.sync(() => Sheet.make(props))) satisfies CreateObject,
      },
    },
  }),
  AppPlugin.addOperationResolverModule({ activate: OperationResolver }),
  AppPlugin.addSchemaModule({ schema: [Sheet.Sheet] }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    activatesOn: ActivationEvent.allOf(ClientEvents.ClientReady, AutomationEvents.ComputeRuntimeReady),
    activate: ComputeGraphRegistry,
  }),
  Plugin.addModule({
    activatesOn: MarkdownEvents.SetupExtensions,
    activate: Markdown,
  }),
  Plugin.addModule({
    // TODO(wittjosiah): More relevant event?
    activatesOn: AppActivationEvents.AppGraphReady,
    activate: AnchorSort,
  }),
  Plugin.make,
);
