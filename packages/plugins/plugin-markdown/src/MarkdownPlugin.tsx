//
// Copyright 2025 DXOS.org
//

import { Capabilities, Events, contributes, createIntent, defineModule, definePlugin } from '@dxos/app-framework';
import { type Obj, Ref } from '@dxos/echo';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { SpaceCapabilities } from '@dxos/plugin-space';
import { defineObjectForm } from '@dxos/plugin-space/types';
import { createDocAccessor, getTextInRange } from '@dxos/react-client/echo';
import { translations as editorTranslations } from '@dxos/react-ui-editor';
import { DataType } from '@dxos/schema';

import {
  AnchorSort,
  AppGraphSerializer,
  BLUEPRINT_KEY,
  BlueprintDefinition,
  IntentResolver,
  MarkdownSettings,
  MarkdownState,
  ReactSurface,
  Toolkit,
} from './capabilities';
import { MarkdownEvents } from './events';
import { meta } from './meta';
import { translations } from './translations';
import { Markdown, MarkdownAction } from './types';
import { serializer } from './util';

export const MarkdownPlugin = definePlugin(meta, () => [
  defineModule({
    id: `${meta.id}/module/translations`,
    activatesOn: Events.SetupTranslations,
    activate: () => contributes(Capabilities.Translations, [...translations, ...editorTranslations]),
  }),
  defineModule({
    id: `${meta.id}/module/settings`,
    activatesOn: Events.SetupSettings,
    activate: MarkdownSettings,
  }),
  defineModule({
    id: `${meta.id}/module/state`,
    // TODO(wittjosiah): Does not integrate with settings store.
    //   Should this be a different event?
    //   Should settings store be renamed to be more generic?
    activatesOn: Events.SetupSettings,
    activate: MarkdownState,
  }),
  defineModule({
    id: `${meta.id}/module/metadata`,
    activatesOn: Events.SetupMetadata,
    activate: () =>
      contributes(Capabilities.Metadata, {
        id: Markdown.Document.typename,
        metadata: {
          label: (object: Markdown.Document) => object.name || object.fallbackName,
          icon: 'ph--text-aa--regular',
          iconClassName: 'text-indigoSurfaceText',
          blueprints: [BLUEPRINT_KEY],
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
          objectSchema: Markdown.Document,
          getIntent: () => createIntent(MarkdownAction.Create, {}),
        }),
      ),
  }),
  defineModule({
    id: `${meta.id}/module/schema`,
    activatesOn: ClientEvents.SetupSchema,
    activate: () => contributes(ClientCapabilities.Schema, [DataType.Text]),
  }),
  defineModule({
    id: `${meta.id}/module/react-surface`,
    activatesOn: Events.SetupReactSurface,
    // TODO(wittjosiah): Should occur before the editor is loaded when surfaces activation is more granular.
    activatesBefore: [MarkdownEvents.SetupExtensions],
    activate: ReactSurface,
  }),
  defineModule({
    id: `${meta.id}/module/intent-resolver`,
    activatesOn: Events.SetupIntentResolver,
    activate: IntentResolver,
  }),
  defineModule({
    id: `${meta.id}/module/app-graph-serializer`,
    activatesOn: Events.AppGraphReady,
    activate: AppGraphSerializer,
  }),
  defineModule({
    id: `${meta.id}/module/anchor-sort`,
    // TODO(wittjosiah): More relevant event?
    activatesOn: Events.AppGraphReady,
    activate: AnchorSort,
  }),
  defineModule({
    id: `${meta.id}/module/blueprint`,
    activatesOn: Events.SetupArtifactDefinition,
    activate: BlueprintDefinition,
  }),
  defineModule({
    id: `${meta.id}/module/toolkit`,
    // TODO(wittjosiah): Use a different event.
    activatesOn: Events.Startup,
    activate: Toolkit,
  }),
]);
