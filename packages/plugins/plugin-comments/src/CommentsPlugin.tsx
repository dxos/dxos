//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { translations as threadTranslations } from '@dxos/react-ui-thread/translations';
import { AnchoredTo, Message, Thread } from '@dxos/types';

import {
  AgentRunner,
  AppGraphBuilder,
  CommentState,
  Markdown,
  OperationHandler,
  ReactSurface,
  SkillDefinition,
  UndoMappings,
} from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { AgentIdentity, DEFAULT_AGENT_IDENTITY } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export const CommentsPlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({
    requires: AppGraphBuilder.requires,
    provides: AppGraphBuilder.provides,
    activate: AppGraphBuilder,
  }),
  AppPlugin.addSkillDefinitionModule({
    requires: SkillDefinition.requires,
    provides: SkillDefinition.provides,
    activate: SkillDefinition,
  }),
  AppPlugin.addOperationHandlerModule({
    requires: OperationHandler.requires,
    provides: OperationHandler.provides,
    activate: OperationHandler,
  }),
  AppPlugin.addUndoMappingsModule({
    requires: UndoMappings.requires,
    provides: UndoMappings.provides,
    activate: UndoMappings,
  }),
  AppPlugin.addSchemaModule({
    schema: [AnchoredTo.AnchoredTo, Message.Message, Thread.Thread],
  }),
  AppPlugin.addSurfaceModule({
    requires: ReactSurface.requires,
    provides: ReactSurface.provides,
    activate: ReactSurface,
  }),
  AppPlugin.addTranslationsModule({ translations: [...translations, ...threadTranslations] }),
  Plugin.addLazyModule(CommentState),
  Plugin.addLazyModule(Markdown),
  // Default comment-thread agent runner (one-shot LLM call per scheduled turn).
  // Test/storybook hosts that contribute a stub `AgentRunner` earlier in plugin order — i.e.
  // before CommentsPlugin in the plugins list — win, because `Capability.get` returns the
  // first contribution. The stub must stay a legacy (event-mode) module: `AgentRunner` is a
  // singleton capability, so two dependency-mode providers would trip the duplicate-provider
  // check; only one typed provider may exist at a time.
  Plugin.addLazyModule(AgentRunner),
  // Default agent identity. Hosts wanting a different name contribute their own `AgentIdentity`
  // earlier in plugin order (as a legacy module, for the same singleton-arity reason as above)
  // to win the `Capability.get`.
  Plugin.addModule({
    id: 'agent-identity',
    provides: [AgentIdentity],
    activate: () => Effect.succeed([Capability.provide(AgentIdentity, DEFAULT_AGENT_IDENTITY)]),
  }),
  AppPlugin.addPluginAssetModule({
    asset: { pluginId: meta.profile.key, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' },
  }),
  Plugin.make,
);

export default CommentsPlugin;
