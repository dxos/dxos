//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';
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
import {
  AgentIdentity,
  type AgentIdentity as AgentIdentityType,
  CommentCapabilities,
  DEFAULT_AGENT_IDENTITY,
} from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

/**
 * Test/storybook hosts swap in a stub `AgentRunner`/`AgentIdentity` via these options rather
 * than shadowing by plugin order: `AgentRunner`/`AgentIdentity` are singleton capabilities, so
 * two dependency-mode providers of either would trip the duplicate-provider check.
 */
export type CommentsPluginOptions = {
  agentRunner?: CommentCapabilities.AgentRunner;
  agentIdentity?: AgentIdentityType;
};

export const CommentsPlugin = Plugin.define<CommentsPluginOptions>(meta).pipe(
  Plugin.addLazyModule(AppGraphBuilder),
  Plugin.addLazyModule(SkillDefinition),
  Plugin.addLazyModule(OperationHandler),
  Plugin.addLazyModule(UndoMappings),
  Plugin.addLazyModule(AppCapability.schema([AnchoredTo.AnchoredTo, Message.Message, Thread.Thread])),
  Plugin.addLazyModule(ReactSurface),
  Plugin.addLazyModule(AppCapability.translations([...translations, ...threadTranslations])),
  Plugin.addLazyModule(CommentState),
  Plugin.addLazyModule(Markdown),
  // Default comment-thread agent runner (one-shot LLM call per scheduled turn). `AgentRunner`
  // is a singleton capability, so a test/storybook host that wants a stub runner passes
  // `agentRunner` in `CommentsPluginOptions` instead of contributing a second provider.
  Plugin.addModule((options: CommentsPluginOptions) => {
    const agentRunnerOverride = options.agentRunner;
    return agentRunnerOverride
      ? {
          id: 'agent-runner-override',
          provides: [CommentCapabilities.AgentRunner],
          activate: () => Effect.succeed([Capability.provide(CommentCapabilities.AgentRunner, agentRunnerOverride)]),
        }
      : {
          id: Capability.getModuleTag(AgentRunner),
          requires: AgentRunner.requires,
          provides: AgentRunner.provides,
          activate: AgentRunner,
        };
  }),
  // Default agent identity, overridable via `CommentsPluginOptions.agentIdentity` for the same
  // singleton-arity reason as `AgentRunner` above.
  Plugin.addModule((options: CommentsPluginOptions) => ({
    id: 'agent-identity',
    provides: [AgentIdentity],
    activate: () =>
      Effect.succeed([Capability.provide(AgentIdentity, options.agentIdentity ?? DEFAULT_AGENT_IDENTITY)]),
  })),
  Plugin.addLazyModule(
    AppCapability.pluginAsset({
      pluginId: meta.profile.key,
      path: 'PLUGIN.mdl',
      content: pluginSpec,
      mimeType: 'application/x-mdl',
    }),
  ),
  Plugin.make,
);

export default CommentsPlugin;
