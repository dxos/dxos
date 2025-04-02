//
// Copyright 2023 DXOS.org
//

// @ts-ignore

import { Capabilities, contributes, createIntent, defineModule, definePlugin, Events } from '@dxos/app-framework';
import { isInstanceOf } from '@dxos/echo-schema';
import { ScriptType } from '@dxos/functions/types';
import { RefArray } from '@dxos/live-object';
import { ClientEvents } from '@dxos/plugin-client';
import { DeckCapabilities, DeckEvents } from '@dxos/plugin-deck';
import { SpaceCapabilities } from '@dxos/plugin-space';
import { defineObjectForm } from '@dxos/plugin-space/types';
import { getSpace } from '@dxos/react-client/echo';

import { ArtifactDefinition, Compiler, IntentResolver, ReactSurface, ScriptSettings } from './capabilities';
import { ScriptEvents } from './events';
import { meta, SCRIPT_PLUGIN } from './meta';
import translations from './translations';
import { ScriptAction } from './types';

export const ScriptPlugin = () =>
  definePlugin(meta, [
    defineModule({
      id: `${meta.id}/module/settings`,
      activatesOn: Events.SetupSettings,
      activate: ScriptSettings,
    }),
    defineModule({
      id: `${meta.id}/module/compiler`,
      activatesOn: ScriptEvents.SetupCompiler,
      activate: Compiler,
    }),
    defineModule({
      id: `${meta.id}/module/translations`,
      activatesOn: Events.SetupTranslations,
      activate: () => contributes(Capabilities.Translations, translations),
    }),
    defineModule({
      id: `${meta.id}/module/metadata`,
      activatesOn: Events.SetupMetadata,
      activate: () =>
        contributes(Capabilities.Metadata, {
          id: ScriptType.typename,
          metadata: {
            placeholder: ['object placeholder', { ns: SCRIPT_PLUGIN }],
            icon: 'ph--code--regular',
            // TODO(wittjosiah): Move out of metadata.
            loadReferences: async (script: ScriptType) => await RefArray.loadAll([script.source]),
          },
        }),
    }),
    defineModule({
      id: `${meta.id}/module/complementary-panels`,
      activatesOn: DeckEvents.SetupComplementaryPanels,
      activate: () =>
        contributes(DeckCapabilities.ComplementaryPanel, {
          id: 'function',
          label: ['function panel label', { ns: SCRIPT_PLUGIN }],
          icon: 'ph--terminal--regular',
          fixed: true,
          filter: (node) => isInstanceOf(ScriptType, node.data) && !!getSpace(node.data),
        }),
    }),
    defineModule({
      id: `${meta.id}/module/object-form`,
      activatesOn: ClientEvents.SetupSchema,
      activate: () =>
        contributes(
          SpaceCapabilities.ObjectForm,
          defineObjectForm({
            objectSchema: ScriptType,
            formSchema: ScriptAction.CreateScriptSchema,
            getIntent: (props, options) => createIntent(ScriptAction.Create, { ...props, space: options.space }),
          }),
        ),
    }),
    defineModule({
      id: `${meta.id}/module/react-surface`,
      activatesOn: Events.SetupReactSurface,
      // TODO(wittjosiah): Should occur before the script editor is loaded when surfaces activation is more granular.
      activatesBefore: [ScriptEvents.SetupCompiler],
      activate: ReactSurface,
    }),
    defineModule({
      id: `${meta.id}/module/intent-resolver`,
      activatesOn: Events.SetupIntentResolver,
      activate: IntentResolver,
    }),
    defineModule({
      id: `${meta.id}/module/artifact-definition`,
      activatesOn: Events.SetupArtifactDefinition,
      activate: ArtifactDefinition,
    }),
  ]);
