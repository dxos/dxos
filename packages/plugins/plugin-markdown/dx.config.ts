//
// Copyright 2025 DXOS.org
//

import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as CollaborationOperation from '@dxos/app-toolkit/CollaborationOperation';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as AttentionCapabilities from '@dxos/plugin-attention/AttentionCapabilities';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';
import { trim } from '@dxos/util';

import { MarkdownNamespace } from './src/namespace.ts';
import * as MarkdownCapabilities from './src/types/MarkdownCapabilities.ts';
import * as MarkdownEvents from './src/types/MarkdownEvents.ts';
import * as MarkdownOperation from './src/types/MarkdownOperation.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: MarkdownNamespace.key,
    name: 'Markdown',
    author: 'DXOS',
    description: trim`
      A full-featured markdown editor for authoring documents in your space. Edits flow through a collaborative CodeMirror surface backed by ECHO Text, so every keystroke replicates to other peers in real time without merge conflicts or lost work.

      Documents can be opened in source, preview, or read-only mode and rendered as a full-surface article or as embeddable cards. An optional formatting toolbar exposes headings, lists, links, and other common markdown actions, and dispositional toolbar actions contributed by other plugins are surfaced inline alongside it.

      The editor integrates with the rest of the workspace through @ references that link to any ECHO object, image and file uploads stored in the active space, and anchored comment threads on text ranges. Comments can optionally be routed to an AI agent on every message or only on @mention.

      A built-in skill exposes create, open, and update operations as tools for AI agents. Updates are applied as compact find-and-replace diffs against the document, making it safe for agents to edit large documents incrementally while you continue collaborating.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-markdown',
    icon: { key: 'ph--text-aa--regular', hue: 'indigo' },
    screenshots: [
      {
        dark: 'https://media.dxos.network/plugin-details-markdown-dark.png',
      },
      {
        dark: 'https://assets.composer.space/demos/2026-10-09-plugin-markdown.mp4?v=797e74c3',
      },
      {
        dark: 'https://customer-5rxcjpyab08avpmn.cloudflarestream.com/cdf2656365bb1fd327c1fc2105d75e5a/iframe?poster=https%3A%2F%2Fcustomer-5rxcjpyab08avpmn.cloudflarestream.com%2Fcdf2656365bb1fd327c1fc2105d75e5a%2Fthumbnails%2Fthumbnail.jpg%3Ftime%3D%26height%3D600',
      },
    ],
    tags: ['beta'],
  },
  modules: [
    // Ordering-only: registers the anchor resolver and sort comparator once the app graph exists.
    Capability.lazyModule(
      'AnchorResolver',
      {
        requires: [AppCapabilities.AppGraph],
        activatesOn: MarkdownEvents.Start,
        provides: [AppCapabilities.AnchorResolver],
        environments: ['browser', 'tauri'],
      },
      () => import('./src/capabilities/anchor-resolver.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.anchorSort(() => import('./src/capabilities/anchor-sort.ts', { with: { type: 'module-url' } }), {
      requires: [AppCapabilities.AppGraph],
      activatesOn: MarkdownEvents.Start,
    }),
    AppCapability.commentConfig(
      () => import('./src/capabilities/comment-config.ts', { with: { type: 'module-url' } }),
      {
        activatesOn: MarkdownEvents.Start,
      },
    ),
    SpaceCapability.createObject(
      () => import('./src/capabilities/create-object.ts', { with: { type: 'module-url' } }),
      {
        environments: ['browser', 'node', 'tauri'],
      },
    ),
    AppCapability.settings(() => import('./src/capabilities/settings.ts', { with: { type: 'module-url' } }), {
      provides: [MarkdownCapabilities.Settings],
    }),
    // Browser-only: requires attention's view state, which only the app shell provides.
    Capability.lazyModule(
      'MarkdownState',
      {
        requires: [AttentionCapabilities.ViewState],
        provides: [MarkdownCapabilities.EditorState, MarkdownCapabilities.EditorViews],
        environments: ['browser', 'tauri'],
      },
      () => import('./src/capabilities/state.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.operationHandler(
      OperationHandlerSet.lazy([
        CollaborationOperation.AcceptChange.pipe(
          Operation.lazyHandler(() => import('./src/operations/accept-change.ts', { with: { type: 'module-url' } })),
        ),
        CollaborationOperation.RejectChange.pipe(
          Operation.lazyHandler(() => import('./src/operations/reject-change.ts', { with: { type: 'module-url' } })),
        ),
        CollaborationOperation.RestoreText.pipe(
          Operation.lazyHandler(() => import('./src/operations/restore-text.ts', { with: { type: 'module-url' } })),
        ),
        MarkdownOperation.Create.pipe(
          Operation.lazyHandler(() => import('./src/operations/create.ts', { with: { type: 'module-url' } })),
        ),
        MarkdownOperation.CreateMarkdown.pipe(
          Operation.lazyHandler(() => import('./src/operations/create-markdown.ts', { with: { type: 'module-url' } })),
        ),
        MarkdownOperation.CreateBranch.pipe(
          Operation.lazyHandler(() => import('./src/operations/create-branch.ts', { with: { type: 'module-url' } })),
        ),
        MarkdownOperation.CreateCheckpoint.pipe(
          Operation.lazyHandler(
            () => import('./src/operations/create-checkpoint.ts', { with: { type: 'module-url' } }),
          ),
        ),
        MarkdownOperation.GetHistory.pipe(
          Operation.lazyHandler(() => import('./src/operations/get-history.ts', { with: { type: 'module-url' } })),
        ),
        MarkdownOperation.GetSelection.pipe(
          Operation.lazyHandler(() => import('./src/operations/get-selection.ts', { with: { type: 'module-url' } })),
        ),
        MarkdownOperation.MergeBranch.pipe(
          Operation.lazyHandler(() => import('./src/operations/merge-branch.ts', { with: { type: 'module-url' } })),
        ),
        MarkdownOperation.Open.pipe(
          Operation.lazyHandler(() => import('./src/operations/open.ts', { with: { type: 'module-url' } })),
        ),
        MarkdownOperation.ScrollToAnchor.pipe(
          Operation.lazyHandler(() => import('./src/operations/scroll-to-anchor.ts', { with: { type: 'module-url' } })),
        ),
        MarkdownOperation.SuggestEdit.pipe(
          Operation.lazyHandler(() => import('./src/operations/suggest-edit.ts', { with: { type: 'module-url' } })),
        ),
        MarkdownOperation.Update.pipe(
          Operation.lazyHandler(() => import('./src/operations/update-markdown.ts', { with: { type: 'module-url' } })),
        ),
      ]),
    ),
    AppCapability.surface(() => import('./src/capabilities/react-surface.ts', { with: { type: 'module-url' } }), {
      roles: ['org.dxos.role.article', 'org.dxos.role.cardContent', 'org.dxos.role.section', 'org.dxos.role.tabpanel'],
    }),
    AppCapability.schema(() => import('./src/capabilities/schema.ts', { with: { type: 'module-url' } })),
    AppCapability.skillDefinition(
      () => import('./src/capabilities/skill-definition.ts', { with: { type: 'module-url' } }),
    ),
    Capability.lazyModule(
      'Tour',
      // The tour auto-starts on an attended markdown document, which needs markdown started anyway.
      { provides: [AppCapabilities.Tour], activatesOn: MarkdownEvents.Start, environments: ['browser', 'tauri'] },
      () => import('./src/capabilities/tour.ts', { with: { type: 'module-url' } }),
    ),
    Capability.lazyModule(
      'translations',
      { provides: [AppCapabilities.Translations], environments: ['browser', 'node', 'tauri', 'workerd'] },
      () => import('./src/capabilities/translations.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.undoMappings(() => import('./src/capabilities/undo-mappings.ts', { with: { type: 'module-url' } })),
  ],
});

export const { meta, make, operations } = config;

export default config;
