//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppCapabilities, AppPlugin } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { createDocAccessor, getTextInRange } from '@dxos/echo-db';
import { SpaceOperation } from '@dxos/plugin-space/operations';
import { SpaceCapabilities, type CreateObject } from '@dxos/plugin-space/types';
import { translations as editorTranslations } from '@dxos/react-ui-editor/translations';
import { Text } from '@dxos/schema';

import {
  AnchorSort,
  AppGraphSerializer,
  BlueprintDefinition,
  MarkdownSettings,
  MarkdownState,
  OperationHandler,
  ReactSurface,
} from '#capabilities';
import { meta } from '#meta';
import { MarkdownOperation } from '#operations';
import { translations } from '#translations';
import { Markdown, MarkdownEvents } from '#types';

export const MarkdownPlugin = Plugin.define(meta).pipe(
  AppPlugin.addBlueprintDefinitionModule({ activate: BlueprintDefinition }),
  Plugin.addModule({
    id: 'create-object',
    activatesOn: AppActivationEvents.SetupMetadata,
    activate: Effect.fnUntraced(function* () {
      return Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
        id: Markdown.Document.typename,
        createObject: ((props, options) =>
          Effect.gen(function* () {
            const object = Markdown.make(props);
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
        id: Markdown.Document.typename,
        comments: 'anchored',
        selectionMode: 'multi-range',
        getAnchorLabel: (doc: Markdown.Document, anchor: string): string | undefined => {
          if (doc.content) {
            const [start, end] = anchor.split(':');
            return getTextInRange(createDocAccessor(doc.content.target!, ['content']), start, end);
          }
        },
        scrollToAnchor: MarkdownOperation.ScrollToAnchor,
      } satisfies AppCapabilities.CommentConfig);
    }),
  }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSchemaModule({ schema: [Markdown.Document, Text.Text] }),
  AppPlugin.addSurfaceModule({
    activate: ReactSurface,
    firesBeforeActivation: [MarkdownEvents.SetupExtensions],
  }),
  AppPlugin.addTranslationsModule({ translations: [...translations, ...editorTranslations] }),
  Plugin.addModule({
    activatesOn: AppActivationEvents.SetupSettings,
    activate: MarkdownSettings,
  }),
  Plugin.addModule({
    id: 'state',
    // TODO(wittjosiah): Does not integrate with settings store.
    //   Should this be a different event?
    //   Should settings store be renamed to be more generic?
    activatesOn: AppActivationEvents.SetupSettings,
    activate: MarkdownState,
  }),
  Plugin.addModule({
    activatesOn: AppActivationEvents.AppGraphReady,
    activate: AppGraphSerializer,
  }),
  Plugin.addModule({
    // TODO(wittjosiah): More relevant event?
    activatesOn: AppActivationEvents.AppGraphReady,
    activate: AnchorSort,
  }),
  Plugin.make,
);

export default MarkdownPlugin;
