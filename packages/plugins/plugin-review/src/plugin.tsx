//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';

import {
  AgentIdentityModule,
  AppGraphBuilder,
  CommentsSettings,
  CommentState,
  HistoryGraph,
  HistorySurface,
  Markdown,
  MarkdownBinding,
  Migrations,
  OperationHandler,
  PluginAsset,
  ReactSurface,
  ReviewState,
  Schema,
  SkillDefinition,
  TourFragment,
  Translations,
  UndoMappings,
} from '#capabilities';
import { meta } from '#meta';
import { AgentIdentity } from '#types';

/**
 * Test/storybook hosts swap in a stub agent runner and identity via these options; `AgentIdentity` is a singleton
 * capability, so a second provider would trip the duplicate-provider check.
 */
export type ReviewPluginOptions = {
  agentRunner?: AppCapabilities.CommentAgentRunner;
  agentIdentity?: AgentIdentity.AgentIdentity;
};

export const ReviewPlugin = Plugin.define<ReviewPluginOptions>(meta).pipe(
  Plugin.addModule(AgentIdentityModule),
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(CommentsSettings),
  Plugin.addModule(CommentState),
  Plugin.addModule(HistoryGraph),
  Plugin.addModule(HistorySurface),
  Plugin.addModule(Markdown),
  Plugin.addModule(MarkdownBinding),
  Plugin.addModule(Migrations),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(PluginAsset),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(ReviewState),
  Plugin.addModule(Schema),
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(TourFragment),
  Plugin.addModule(Translations),
  Plugin.addModule(UndoMappings),
  // Test/storybook hosts pass a stub runner; in the app the assistant contributes the real one.
  Plugin.addModule((options: ReviewPluginOptions) => {
    const agentRunner = options.agentRunner;
    return {
      id: 'agent-runner-override',
      provides: agentRunner ? [AppCapabilities.CommentAgentRunner] : [],
      activate: () =>
        Effect.succeed(agentRunner ? [Capability.contribute(AppCapabilities.CommentAgentRunner, agentRunner)] : []),
    };
  }),
  Plugin.make,
);

export default ReviewPlugin;
