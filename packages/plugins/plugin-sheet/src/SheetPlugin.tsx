//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';

import { ActivationEvent, Capability, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppCapabilities, AppPlugin } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { AutomationEvents } from '@dxos/plugin-automation/types';
import { ClientEvents } from '@dxos/plugin-client/types';
import { MarkdownEvents } from '@dxos/plugin-markdown/types';
import { SpaceOperation } from '@dxos/plugin-space/operations';
import { SpaceCapabilities, type CreateObject } from '@dxos/plugin-space/types';

import {
  AnchorSort,
  ComputeGraphRegistry,
  Markdown,
  OperationHandler,
  UndoMappings,
  ReactSurface,
  SheetState,
} from '#capabilities';
import { meta } from '#meta';
import { SheetOperation } from '#operations';
import { translations } from '#translations';
import { Sheet } from '#types';

export const SheetPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    id: 'create-object',
    activatesOn: AppActivationEvents.SetupMetadata,
    activate: Effect.fnUntraced(function* () {
      return Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
        id: Sheet.Sheet.typename,
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
      });
    }),
  }),
  Plugin.addModule({
    id: 'comment-config',
    activatesOn: AppActivationEvents.SetupMetadata,
    activate: Effect.fnUntraced(function* () {
      return Capability.contributes(AppCapabilities.CommentConfig, {
        id: Sheet.Sheet.typename,
        comments: 'anchored',
        scrollToAnchor: SheetOperation.ScrollToAnchor,
      } satisfies AppCapabilities.CommentConfig);
    }),
  }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addUndoMappingsModule({ activate: UndoMappings }),
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

export default SheetPlugin;
