//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Capabilities, Events, contributes, createIntent, defineModule, definePlugin } from '@dxos/app-framework';
import { Ref } from '@dxos/echo';
import { ScriptType } from '@dxos/functions';
import { ClientEvents } from '@dxos/plugin-client';
import { SpaceCapabilities } from '@dxos/plugin-space';
import { defineObjectForm } from '@dxos/plugin-space/types';

import {
  AppGraphBuilder,
  BlueprintDefinition,
  Compiler,
  IntentResolver,
  ReactSurface,
  ScriptSettings,
} from './capabilities';
import { ScriptEvents } from './events';
import { meta } from './meta';
import { translations } from './translations';
import { ScriptAction } from './types';

export const ScriptPlugin = definePlugin(meta, () => [
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
          icon: 'ph--code--regular',
          // TODO(wittjosiah): Move out of metadata.
          loadReferences: async (script: ScriptType) => await Ref.Array.loadAll([script.source]),
        },
      }),
  }),
  defineModule({
    id: `${meta.id}/module/app-graph-builder`,
    activatesOn: Events.SetupAppGraph,
    activate: AppGraphBuilder,
  }),
  defineModule({
    id: `${meta.id}/module/object-form`,
    activatesOn: ClientEvents.SetupSchema,
    activate: () =>
      contributes(
        SpaceCapabilities.ObjectForm,
        defineObjectForm({
          objectSchema: ScriptType,
          formSchema: ScriptAction.CreateScriptSchema.pipe(Schema.omit('initialTemplateId')),
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
    id: `${meta.id}/module/blueprint`,
    activatesOn: Events.SetupArtifactDefinition,
    activate: BlueprintDefinition,
  }),
]);
