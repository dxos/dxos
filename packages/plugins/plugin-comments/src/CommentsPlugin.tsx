//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';

import { ActivationEvents, Capability, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { MarkdownEvents } from '@dxos/plugin-markdown';
import { translations as threadTranslations } from '@dxos/react-ui-thread/translations';
import { AnchoredTo, Message, Thread } from '@dxos/types';

import {
  AgentRunner,
  AppGraphBuilder,
  BlueprintDefinition,
  Markdown,
  OperationHandler,
  UndoMappings,
  ReactSurface,
  CommentState,
} from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { AgentIdentity, DEFAULT_AGENT_IDENTITY } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export const CommentsPlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),
  AppPlugin.addBlueprintDefinitionModule({ activate: BlueprintDefinition }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addUndoMappingsModule({ activate: UndoMappings }),
  AppPlugin.addSchemaModule({
    schema: [AnchoredTo.AnchoredTo, Message.Message, Thread.Thread],
  }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations: [...translations, ...threadTranslations] }),
  Plugin.addModule({
    id: 'state',
    activatesOn: AppActivationEvents.SetupSettings,
    activate: CommentState,
  }),
  Plugin.addModule({
    id: 'markdown',
    activatesOn: MarkdownEvents.SetupExtensions,
    activate: Markdown,
  }),
  // Default comment-thread agent runner (one-shot LLM call per scheduled turn).
  // Test/storybook hosts that contribute a stub `AgentRunner` earlier in plugin
  // order — i.e. before CommentsPlugin in the plugins list — win, because
  // `Capability.get` returns the first contribution.
  Plugin.addModule({
    id: 'agent-runner',
    activatesOn: ActivationEvents.Startup,
    activate: AgentRunner,
  }),
  // Default agent identity. Hosts wanting a different name contribute their own
  // `AgentIdentity` earlier in plugin order to win the `Capability.get`.
  Plugin.addModule({
    id: 'agent-identity',
    activatesOn: ActivationEvents.Startup,
    activate: () => Effect.succeed(Capability.contributes(AgentIdentity, DEFAULT_AGENT_IDENTITY)),
  }),
  AppPlugin.addPluginAssetModule({
    asset: { pluginId: meta.profile.key, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' },
  }),
  Plugin.make,
);

export default CommentsPlugin;
