//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Common, Plugin } from '@dxos/app-framework';
import { type Obj, Ref } from '@dxos/echo';
import { createDocAccessor, getTextInRange } from '@dxos/echo-db';
import { type CreateObject } from '@dxos/plugin-space/types';
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
  OperationResolver,
  ReactSurface,
} from './capabilities';
import { MarkdownEvents } from './events';
import { meta } from './meta';
import { translations } from './translations';
import { Markdown } from './types';
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
        createObject: ((props) => Effect.sync(() => Markdown.make(props))) satisfies CreateObject,
        addToCollectionOnCreate: true,
      },
    },
  }),
  Common.Plugin.addSchemaModule({ schema: [Markdown.Document, Text.Text] }),
  Common.Plugin.addSurfaceModule({
    activate: ReactSurface,
    activatesBefore: [MarkdownEvents.SetupExtensions],
  }),
  Common.Plugin.addIntentResolverModule({ activate: IntentResolver }),
  Common.Plugin.addOperationResolverModule({ activate: OperationResolver }),
  Plugin.addModule({
    activatesOn: Common.ActivationEvent.AppGraphReady,
    activate: AppGraphSerializer,
  }),
  Plugin.addModule({
    // TODO(wittjosiah): More relevant event?
    activatesOn: Common.ActivationEvent.AppGraphReady,
    activate: AnchorSort,
  }),
  Common.Plugin.addBlueprintDefinitionModule({ activate: BlueprintDefinition }),
  Plugin.make,
);
