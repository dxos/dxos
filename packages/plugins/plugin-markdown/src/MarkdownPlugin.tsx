//
// Copyright 2025 DXOS.org
//

import { Capability, Common, Plugin, createIntent } from '@dxos/app-framework';
import { type Obj, Ref } from '@dxos/echo';
import { createDocAccessor, getTextInRange } from '@dxos/echo-db';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { type CreateObjectIntent } from '@dxos/plugin-space/types';
import { translations as editorTranslations } from '@dxos/react-ui-editor';
import { Text } from '@dxos/schema';

import { MarkdownBlueprint } from './blueprints';
import {
  AnchorSort,
  AppGraphSerializer,
  BlueprintDefinition,
  IntentResolver,
  MarkdownSettings,
  MarkdownState,
  ReactSurface,
} from './capabilities';
import { MarkdownEvents } from './events';
import { meta } from './meta';
import { translations } from './translations';
import { Markdown, MarkdownAction } from './types';
import { serializer } from './util';

export const MarkdownPlugin = Plugin.define(meta).pipe(
  Common.Plugin.addTranslationsModule({ translations: [...translations, ...editorTranslations] }),
  Plugin.addModule({
    activatesOn: Common.ActivationEvent.SetupSettings,
    activate: MarkdownSettings,
  }),
  Plugin.addModule({
    id: 'state',
    // TODO(wittjosiah): Does not integrate with settings store.
    //   Should this be a different event?
    //   Should settings store be renamed to be more generic?
    activatesOn: Common.ActivationEvent.SetupSettings,
    activate: MarkdownState,
  }),
  Common.Plugin.addMetadataModule({
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
        loadReferences: async (doc: Markdown.Document) => await Ref.Array.loadAll<Obj.Any>([doc.content]),
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
        createObjectIntent: (() => createIntent(MarkdownAction.Create)) satisfies CreateObjectIntent,
        addToCollectionOnCreate: true,
      },
    },
  }),
  Plugin.addModule({
    id: 'schema',
    activatesOn: ClientEvents.SetupSchema,
    activate: () => Capability.contributes(ClientCapabilities.Schema, [Markdown.Document, Text.Text]),
  }),
  Common.Plugin.addSurfaceModule({
    activate: ReactSurface,
    activatesBefore: [MarkdownEvents.SetupExtensions],
  }),
  Common.Plugin.addIntentResolverModule({ activate: IntentResolver }),
  Plugin.addModule({
    activatesOn: Common.ActivationEvent.AppGraphReady,
    activate: AppGraphSerializer,
  }),
  Plugin.addModule({
    // TODO(wittjosiah): More relevant event?
    activatesOn: Common.ActivationEvent.AppGraphReady,
    activate: AnchorSort,
  }),
  Plugin.addModule({
    activatesOn: Common.ActivationEvent.SetupArtifactDefinition,
    activate: BlueprintDefinition,
  }),
  Plugin.make,
);
