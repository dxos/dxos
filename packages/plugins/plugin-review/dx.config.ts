//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as MarkdownCapabilities from '@dxos/plugin-markdown/MarkdownCapabilities';
import * as MarkdownEvents from '@dxos/plugin-markdown/MarkdownEvents';
import { trim } from '@dxos/util';

import { ReviewNamespace } from './src/namespace.ts';
import * as AgentIdentity from './src/types/AgentIdentity.ts';
import * as CommentCapabilities from './src/types/CommentCapabilities.ts';
import * as ReviewCapabilities from './src/types/ReviewCapabilities.ts';
import * as ReviewEvents from './src/types/ReviewEvents.ts';
import { type ReviewPluginOptions } from './src/types/ReviewPluginOptions.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig<ReviewPluginOptions> = Plugin.config<ReviewPluginOptions>({
  plugin: {
    key: ReviewNamespace.key,
    name: 'Review',
    author: 'DXOS',
    description: trim`
      ReviewPlugin renders comment threads anchored to ECHO objects (primarily Markdown
      documents). Threads can be created inline on any commentable object, letting collaborators
      leave contextual comments and hold focused discussions without leaving the document surface.

      The same companion doubles as a document review surface: a document's active suggestion
      branches (one per author) are diffed against the current content and rendered as change-block
      tiles alongside comment threads, so comments and Google-Docs-style suggestions share one
      review UI. Each suggestion tile carries Accept/Reject controls that route through durable,
      per-change cherry-pick / revert operations, and every suggestion is tinted with its author's
      palette colour (matching the author's avatar/tag and the editor's inline markers). When there
      are neither comments nor suggestions, a single empty-state prompt explains both affordances.

      Each thread carries an optional AI agent configuration that controls how the built-in
      assistant participates in the conversation. Threads can be set to off, mention-only (the
      agent responds only when @-mentioned by name), or auto mode (the agent replies to every new
      user message). The agent identity — display name, DID, and avatar — is resolved at runtime
      from a pluggable Effect capability so host applications can substitute their own assistant
      persona.

      When the agent is enabled, it executes one LLM turn per trigger via the AgentRunner
      capability. The runner has access to edit tools that can splice a replacement range into the
      anchored document span or replace the entire document content, so the assistant can propose
      inline edits in addition to posting chat replies. A self-loop guard prevents the agent from
      responding to its own messages, and resolved threads are excluded from triggering.

      The plugin is fully self-contained and depends on no other Composer plugin: shared
      message/thread UI comes from @dxos/react-ui-thread and the Thread/Message/AnchoredTo schema
      comes from @dxos/types.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-review',
    icon: { key: 'ph--chat-text--regular', hue: 'indigo' },
    spec: 'PLUGIN.mdl',
    tags: ['beta'],
  },
  modules: [
    Capability.lazyModule(
      'agent-identity',
      { requires: [], provides: [AgentIdentity.AgentIdentity] },
      () => import('./src/capabilities/agent-identity.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.appGraphBuilder(
      () => import('./src/capabilities/app-graph-builder.ts', { with: { type: 'module-url' } }),
      {
        environments: ['browser', 'node', 'tauri'],
      },
    ),
    AppCapability.settings(() => import('./src/capabilities/settings.ts', { with: { type: 'module-url' } }), {
      activatesOn: ActivationEvents.Idle,
      provides: [CommentCapabilities.Settings],
    }),
    Capability.lazyModule(
      'CommentState',
      // Headless: comments sync in a markdown document with no review surface ever rendered, so gating
      // this on the review UI's start is wrong. Ungated (hence idle) it is also pullable by the
      // consumers that need it earlier, which a start-gated provider is not.
      { provides: [CommentCapabilities.State] },
      () => import('./src/capabilities/state.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.appGraphBuilder(
      () => import('./src/capabilities/history-graph.ts', { with: { type: 'module-url' } }),
      {
        name: 'HistoryGraph',
        environments: ['browser', 'node', 'tauri'],
      },
    ),
    AppCapability.surface(() => import('./src/capabilities/history-surface.tsx', { with: { type: 'module-url' } }), {
      roles: ['org.dxos.role.article', 'org.dxos.role.objectProperties'],
      name: 'HistorySurface',
    }),
    Capability.lazyModule(
      'MarkdownExtension',
      // OperationInvoker/AtomRegistry are ambient. `CommentCapabilities.State` is declared because the
      // provider callbacks read it and it is contributed by this plugin's own idle-gated module, which
      // markdown start can otherwise precede.
      {
        environments: ['browser', 'node', 'tauri'],
        requires: [CommentCapabilities.State],
        provides: [MarkdownCapabilities.ExtensionProvider, MarkdownCapabilities.ViewModeExtension],
        activatesOn: MarkdownEvents.Start,
      },
      () => import('./src/capabilities/markdown-extension.ts', { with: { type: 'module-url' } }),
    ),
    // Markdown owns the editor-binding socket; this plugin owns the version-aware behaviour, and gates
    // the history companion for markdown documents. Browser-only: the binding it contributes is
    // `useMarkdownEditorBinding`, a React hook that mounts the version toolbar and suggestion overlays.
    Capability.lazyModule(
      'MarkdownBinding',
      {
        provides: [MarkdownCapabilities.EditorBindingHook, ReviewCapabilities.HistoryProvider],
        activatesOn: MarkdownEvents.Start,
        environments: ['browser', 'tauri'],
      },
      () => import('./src/capabilities/markdown-binding.ts', { with: { type: 'module-url' } }),
    ),
    // Eager, like every migration provider: a migration missing when a space opens leaves its objects unreadable.
    Capability.lazyModule(
      'ReviewMigrations',
      { provides: [ClientCapabilities.Migration] },
      () => import('./src/capabilities/migrations.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.operationHandler(
      () => import('./src/capabilities/operation-handler.ts', { with: { type: 'module-url' } }),
      {
        activatesOn: ActivationEvents.Idle,
      },
    ),
    AppCapability.pluginAsset({
      pluginId: ReviewNamespace.key,
      path: 'PLUGIN.mdl',
      content: () => import('./PLUGIN.mdl?raw', { with: { type: 'module-url' } }),
      mimeType: 'application/x-mdl',
    }),
    AppCapability.surface(() => import('./src/capabilities/react-surface.ts', { with: { type: 'module-url' } }), {
      roles: ['org.dxos.role.article'],
    }),
    Capability.lazyModule(
      'ReviewState',
      {
        provides: [ReviewCapabilities.ReviewRenderPolicy],
        activatesOn: ReviewEvents.Start,
        environments: ['browser', 'node', 'tauri'],
      },
      () => import('./src/capabilities/review-state.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.schema(() => import('./src/capabilities/schema.ts', { with: { type: 'module-url' } })),
    AppCapability.skillDefinition(
      () => import('./src/capabilities/skill-definition.ts', { with: { type: 'module-url' } }),
      {
        environments: ['browser', 'node', 'tauri'],
      },
    ),
    Capability.lazyModule(
      'TourFragment',
      { provides: [AppCapabilities.TourFragment], environments: ['browser', 'tauri'] },
      () => import('./src/capabilities/tour-fragment.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.translations(() => import('./src/capabilities/translations.ts', { with: { type: 'module-url' } })),
    AppCapability.undoMappings(() => import('./src/capabilities/undo-mappings.ts', { with: { type: 'module-url' } }), {
      activatesOn: ReviewEvents.Start,
      environments: ['browser', 'node', 'tauri'],
    }),
    // Test/storybook hosts pass a stub runner; in the app the assistant contributes the real one.
    // Unconditional `provides`: the body contributes nothing when no runner is given.
    Capability.lazyModule(
      'agent-runner-override',
      { requires: [], provides: [AppCapabilities.CommentAgentRunner] },
      () => import('./src/capabilities/agent-runner-override.ts', { with: { type: 'module-url' } }),
    ),
  ],
});

export const { meta, make } = config;

export default config;
