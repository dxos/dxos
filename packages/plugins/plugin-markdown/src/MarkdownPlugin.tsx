//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, createIntent, defineModule, definePlugin, Events } from '@dxos/app-framework';
import { isInstanceOf, type BaseObject } from '@dxos/echo-schema';
import { RefArray } from '@dxos/live-object';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { SpaceCapabilities } from '@dxos/plugin-space';
import { defineObjectForm } from '@dxos/plugin-space/types';
import { translations as editorTranslations } from '@dxos/react-ui-editor';
import { DataType } from '@dxos/schema';

import {
  AnchorSort,
  AppGraphSerializer,
  ArtifactDefinition,
  IntentResolver,
  MarkdownState,
  MarkdownSettings,
  ReactSurface,
} from './capabilities';
import { MarkdownEvents } from './events';
import { meta } from './meta';
import translations from './translations';
import { DocumentType, MarkdownAction } from './types';
import { serializer } from './util';

export const MarkdownPlugin = () =>
  definePlugin(meta, [
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
          id: DocumentType.typename,
          metadata: {
            label: (object: any) =>
              isInstanceOf(DocumentType, object) ? object.name || object.fallbackName : undefined,
            icon: 'ph--text-aa--regular',
            graphProps: {
              managesAutofocus: true,
            },
            // TODO(wittjosiah): Move out of metadata.
            loadReferences: async (doc: DocumentType) => await RefArray.loadAll<BaseObject>([doc.content]),
            serializer,
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
            objectSchema: DocumentType,
            getIntent: (_, { space }) => createIntent(MarkdownAction.Create, { spaceId: space.id }),
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
      id: `${meta.id}/module/artifact-definition`,
      activatesOn: Events.SetupArtifactDefinition,
      activate: ArtifactDefinition,
    }),
  ]);
