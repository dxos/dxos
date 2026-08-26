//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';

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
  PluginAsset,
  ReactSurface,
  ReviewState,
  Schema,
  SkillDefinition,
  Translations,
  UndoMappings,
} from '#capabilities';
import { meta } from '#meta';
import { AgentIdentity, CommentCapabilities } from '#types';

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
  Plugin.addModule(AgentIdentityModule),
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(CommentState),
  Plugin.addModule(HistoryGraph),
  Plugin.addModule(HistorySurface),
  Plugin.addModule(Markdown),
  Plugin.addModule(MarkdownBinding),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(PluginAsset),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(ReviewState),
  Plugin.addModule(Schema),
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(Translations),
  Plugin.addModule(UndoMappings),
  // Default comment-thread agent runner (one-shot LLM call per scheduled turn). `AgentRunner`
  // is a singleton capability, so a test/storybook host that wants a stub runner passes
  // `agentRunner` in `ReviewPluginOptions` instead of contributing a second provider.
  Plugin.addModule((options: ReviewPluginOptions) => {
    const agentRunnerOverride = options.agentRunner;
    if (agentRunnerOverride) {
      return {
        id: 'agent-runner-override',
        provides: [CommentCapabilities.AgentRunner],
        activate: () => Effect.succeed([Capability.contribute(CommentCapabilities.AgentRunner, agentRunnerOverride)]),
      };
    }
    // `AgentRunner` is browser-only (the generated node/workerd `#capabilities` barrels stub it to
    // `undefined`) — headless environments never contributed a default comment-thread agent runner
    // before this module list was unified into one canonical entry, so this stays a no-op there.
    return AgentRunner
      ? {
          id: Capability.getModuleTag(AgentRunner),
          requires: AgentRunner.requires,
          provides: AgentRunner.provides,
          activate: AgentRunner,
        }
      : { id: 'agent-runner-unavailable', provides: [], activate: () => Effect.succeed([]) };
  }),
  Plugin.make,
);

export default ReviewPlugin;
