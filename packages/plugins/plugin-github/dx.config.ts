//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as ConnectorEvents from '@dxos/plugin-connector/ConnectorEvents';
import * as ConnectorSpec from '@dxos/plugin-connector/ConnectorSpec';
import * as CrxCapabilities from '@dxos/plugin-crx/CrxCapabilities';
import * as CrxEvents from '@dxos/plugin-crx/CrxEvents';
import * as MarkdownCapabilities from '@dxos/plugin-markdown/MarkdownCapabilities';
import * as MarkdownEvents from '@dxos/plugin-markdown/MarkdownEvents';
import * as PreviewCapabilities from '@dxos/plugin-preview/PreviewCapabilities';
import * as PreviewEvents from '@dxos/plugin-preview/PreviewEvents';
import * as SearchCapabilities from '@dxos/plugin-search/SearchCapabilities';
import * as SearchEvents from '@dxos/plugin-search/SearchEvents';
import { trim } from '@dxos/util';

import { GitHubNamespace } from './src/namespace.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: GitHubNamespace.key,
    name: 'GitHub',
    author: 'DXOS',
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-github',
    spec: 'PLUGIN.mdl',
    description: trim`
      Connect GitHub to your Composer workspace so organizations, repositories,
      issues, and pull requests stay available alongside everything else you're
      working on.

      Authenticate with a GitHub OAuth App or GitHub App and select the
      repositories you want to track.  On each sync pass the plugin pulls
      organizations and their members into ECHO as Organization and Person
      objects, and mirrors every repository as a Project and every issue or
      pull request as a Task - with open mapping to "todo" and closed mapping
      to "done".

      Edits made locally to issue title, description, or open/closed status
      are pushed back to GitHub via a snapshot-diff reconciliation step, so
      changes flow in both directions.  Pull request status is deliberately
      pull-only to avoid accidental closes; repo renames are similarly guarded.

      All GitHub data is stored in ECHO and replicated to other peers in the
      space, giving the whole team a shared, local-first view of the project
      without requiring each member to hold their own GitHub token.
    `,
    icon: { key: 'ph--github-logo--regular', hue: 'purple' },
    tags: ['labs', 'connector'],
  },
  modules: [
    // Browser-only: the search dialog it answers renders nowhere else.
    Capability.lazyModule(
      'SearchQueryAction',
      {
        requires: [Capabilities.OperationInvoker],
        provides: [SearchCapabilities.QueryAction],
        activatesOn: SearchEvents.Start,
        environments: ['browser', 'tauri'],
      },
      () => import('./src/capabilities/search-query-action.ts', { with: { type: 'module-url' } }),
    ),
    // Narrower than the `appGraphBuilder` family default: the action opens a dialog, which means
    // nothing without an app shell.
    AppCapability.appGraphBuilder(
      () => import('./src/capabilities/app-graph-builder.ts', { with: { type: 'module-url' } }),
      {
        environments: ['browser', 'tauri'],
      },
    ),
    Capability.lazyModule(
      'GitHubConnector',
      { provides: [ConnectorSpec.Connector], activatesOn: ConnectorEvents.Start },
      () => import('./src/capabilities/connector.ts', { with: { type: 'module-url' } }),
    ),
    Capability.lazyModule(
      'LinkResolver',
      {
        provides: [PreviewCapabilities.LinkResolver],
        activatesOn: PreviewEvents.Start,
        environments: ['browser', 'tauri'],
      },
      () => import('./src/capabilities/link-resolver.ts', { with: { type: 'module-url' } }),
    ),
    // Browser-only: the editor it decorates and the popover it answers render nowhere else.
    Capability.lazyModule(
      'MarkdownExtension',
      {
        provides: [MarkdownCapabilities.ExtensionProvider],
        activatesOn: MarkdownEvents.Start,
        environments: ['browser', 'tauri'],
      },
      () => import('./src/capabilities/markdown-extension.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.operationHandler(
      () => import('./src/capabilities/operation-handler.ts', { with: { type: 'module-url' } }),
      {
        activatesOn: ActivationEvents.Idle,
      },
    ),
    Capability.lazyModule(
      'PageActionProvider',
      { provides: [CrxCapabilities.PageAction], activatesOn: CrxEvents.Start },
      () => import('./src/capabilities/page-action.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.pluginAsset({
      pluginId: GitHubNamespace.key,
      path: 'PLUGIN.mdl',
      content: () => import('./PLUGIN.mdl?raw', { with: { type: 'module-url' } }),
      mimeType: 'application/x-mdl',
    }),
    AppCapability.surface(() => import('./src/capabilities/react-surface.ts', { with: { type: 'module-url' } }), {
      roles: ['org.dxos.role.cardContent', 'org.dxos.role.cardMenu', 'org.dxos.role.article', 'org.dxos.role.dialog'],
    }),
    AppCapability.schema(() => import('./src/capabilities/schema.ts', { with: { type: 'module-url' } })),
    AppCapability.skillDefinition(
      () => import('./src/capabilities/skill-definition.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'module-url' } })),
  ],
});

export const { meta, make } = config;

export default config;
