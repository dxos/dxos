//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { translations as threadTranslations } from '@dxos/react-ui-thread/translations';
import { AnchoredTo, Message, Thread } from '@dxos/types';

import {
  AgentIdentityModule,
  AgentRunner,
  AppGraphBuilder,
  CommentState,
  HistoryGraph,
  HistorySurface,
  Markdown,
  MarkdownBinding,
  OperationHandler,
  ReactSurface,
  ReviewState,
  SkillDefinition,
  UndoMappings,
} from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { CommentCapabilities } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';
import * as AgentIdentity from './types/AgentIdentity';

/**
 * Test/storybook hosts swap in a stub `AgentRunner`/`AgentIdentity` via these options rather
 * than shadowing by plugin order: `AgentRunner`/`AgentIdentity` are singleton capabilities, so
 * two dependency-mode providers of either would trip the duplicate-provider check.
 */
export type ReviewPluginOptions = {
  agentRunner?: CommentCapabilities.AgentRunner;
  agentIdentity?: AgentIdentity.AgentIdentity;
};

export const ReviewPlugin = Plugin.define<ReviewPluginOptions>(meta).pipe(
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(HistoryGraph),
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(UndoMappings),
  Plugin.addModule(AppCapability.schema([AnchoredTo.AnchoredTo, Message.Message, Thread.Thread])),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(HistorySurface),
  Plugin.addModule(AppCapability.translations([...translations, ...threadTranslations])),
  Plugin.addModule(CommentState),
  Plugin.addModule(ReviewState),
  Plugin.addModule(MarkdownBinding),
  Plugin.addModule(Markdown),
  // Default comment-thread agent runner (one-shot LLM call per scheduled turn). `AgentRunner`
  // is a singleton capability, so a test/storybook host that wants a stub runner passes
  // `agentRunner` in `ReviewPluginOptions` instead of contributing a second provider.
  Plugin.addModule((options: ReviewPluginOptions) => {
    const agentRunnerOverride = options.agentRunner;
    return agentRunnerOverride
      ? {
          id: 'agent-runner-override',
          provides: [CommentCapabilities.AgentRunner],
          activate: () => Effect.succeed([Capability.contribute(CommentCapabilities.AgentRunner, agentRunnerOverride)]),
        }
      : {
          id: Capability.getModuleTag(AgentRunner),
          requires: AgentRunner.requires,
          provides: AgentRunner.provides,
          activate: AgentRunner,
        };
  }),
  Plugin.addModule(AgentIdentityModule),
  Plugin.addModule(
    AppCapability.pluginAsset({
      pluginId: meta.profile.key,
      path: 'PLUGIN.mdl',
      content: pluginSpec,
      mimeType: 'application/x-mdl',
    }),
  ),
  Plugin.make,
);

export default ReviewPlugin;
