//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { ActivationEvent, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { Annotation } from '@dxos/echo';
import { Operation } from '@dxos/operation';
import { AutomationEvents } from '@dxos/plugin-automation/types';
import { ClientEvents } from '@dxos/plugin-client/types';
import { MarkdownEvents } from '@dxos/plugin-markdown';
import { type CreateObject } from '@dxos/plugin-space/types';
import { SpaceOperation } from '@dxos/plugin-space/operations';

import { meta } from '#meta';
import { serializer } from './serializer';
import { translations } from './translations';
import { Sheet } from '#types';
import { SheetOperation } from '#operations';

import {
  AnchorSort,
  ComputeGraphRegistry,
  Markdown,
  OperationHandler,
  UndoMappings,
  ReactSurface,
  SheetState,
} from '#capabilities';

export const SheetPlugin = Plugin.define(meta).pipe(
  AppPlugin.addMetadataModule({
    metadata: {
      id: Sheet.Sheet.typename,
      metadata: {
        label: (object: Sheet.Sheet) => object.name,
        icon: Annotation.IconAnnotation.get(Sheet.Sheet).pipe(Option.getOrThrow).icon,
        iconHue: Annotation.IconAnnotation.get(Sheet.Sheet).pipe(Option.getOrThrow).hue ?? 'white',
        serializer,
        comments: 'anchored',
        createObject: ((props, options) =>
          Effect.gen(function* () {
            const object = Sheet.make(props);
            return yield* Operation.invoke(SpaceOperation.AddObject, {
              object,
              target: options.target,
              hidden: true,
              targetNodeId: options.targetNodeId,
            });
          })) satisfies CreateObject,
        scrollToAnchor: SheetOperation.ScrollToAnchor,
      },
    },
  }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addOperationHandlerModule({ id: 'undo-mappings', activate: UndoMappings }),
  AppPlugin.addSchemaModule({ schema: [Sheet.Sheet] }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    activatesOn: AppActivationEvents.SetupSettings,
    activate: SheetState,
  }),
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
