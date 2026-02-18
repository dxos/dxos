//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { type Obj, Ref } from '@dxos/echo';
import { createDocAccessor, getTextInRange } from '@dxos/echo-db';
import { Operation } from '@dxos/operation';
import { SpaceCapabilities, SpaceEvents } from '@dxos/plugin-space';
import { type CreateObject } from '@dxos/plugin-space/types';
import { translations as editorTranslations } from '@dxos/react-ui-editor';
import { Text } from '@dxos/schema';

import { MarkdownBlueprint } from './blueprints';
import {
  AnchorSort,
  AppGraphSerializer,
  BlueprintDefinition,
  MarkdownSettings,
  MarkdownState,
  OperationResolver,
  ReactSurface,
} from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { Markdown, MarkdownEvents, MarkdownOperation } from './types';
import { serializer } from './util';

export const MarkdownPlugin = Plugin.define(meta).pipe(
  AppPlugin.addBlueprintDefinitionModule({ activate: BlueprintDefinition }),
  AppPlugin.addMetadataModule({
    metadata: {
      id: Markdown.Document.typename,
      metadata: {
        label: (object: Markdown.Document) => object.name || object.fallbackName,
        icon: 'ph--text-aa--regular',
        iconHue: 'indigo',
        blueprints: [MarkdownBlueprint.Key],
        graphProps: {
          managesAutofocus: true,
        },
        // TODO(wittjosiah): Move out of metadata.
        loadReferences: async (doc: Markdown.Document) => await Ref.Array.loadAll<Obj.Unknown>([doc.content]),
        serializer,
        // TODO(wittjosiah): Consider how to do generic comments without these.
        comments: 'anchored',
        selectionMode: 'multi-range',
        getAnchorLabel: (doc: Markdown.Document, anchor: string): string | undefined => {
          if (doc.content) {
            const [start, end] = anchor.split(':');
            return getTextInRange(createDocAccessor(doc.content.target!, ['content']), start, end);
          }
        },
        createObject: ((props) => Effect.sync(() => Markdown.make(props))) satisfies CreateObject,
      },
    },
  }),
  AppPlugin.addOperationResolverModule({ activate: OperationResolver }),
  AppPlugin.addSchemaModule({ schema: [Markdown.Document, Text.Text] }),
  AppPlugin.addSurfaceModule({
    activate: ReactSurface,
    activatesBefore: [MarkdownEvents.SetupExtensions],
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
    id: 'on-space-created',
    activatesOn: SpaceEvents.SpaceCreated,
    activate: () =>
      Effect.succeed(
        Capability.contributes(SpaceCapabilities.OnCreateSpace, (params) =>
          Operation.invoke(MarkdownOperation.OnCreateSpace, params),
        ),
      ),
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
