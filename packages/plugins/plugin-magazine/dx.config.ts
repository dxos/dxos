//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as AppRole from '@dxos/app-toolkit/AppRole';
import * as AttentionCapabilities from '@dxos/plugin-attention/AttentionCapabilities';
import * as RoutineCapabilities from '@dxos/plugin-routine/RoutineCapabilities';
import * as RoutineEvents from '@dxos/plugin-routine/RoutineEvents';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';
import { trim } from '@dxos/util';

import { MagazineNamespace } from './src/namespace.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: MagazineNamespace.key,
    name: 'Magazine',
    author: 'DXOS',
    description: trim`
      MagazinePlugin brings syndicated content into DXOS Composer by syncing RSS feeds
      and ATproto (Bluesky) feeds as ECHO objects stored in the user's space.
      Subscribed feeds are polled incrementally using a cursor so only new posts
      are fetched on each sync, and feed metadata (name, icon, description) is
      persisted alongside the posts for offline access.

      Magazines are agent-curated collections drawn from one or more feeds. Each
      Magazine carries the user's topic instructions describing what it should
      cover; pressing the Curate button (or a scheduled trigger) syncs all
      referenced feeds in parallel, then runs a single-shot agent pass that selects
      matching posts and returns their ids, which the operation adds mechanically.
      The agent's base methodology — how to select, how to dedup, and the structured
      output contract — lives in the MagazineSkill. Each magazine stores a
      persisted curation Routine (created at magazine creation time) whose instructions
      hold the editorial brief; pressing Curate runs that Routine against the synced
      candidates via RunInstructions. The skill also exposes a FetchArticleContent
      tool the agent may call to read a candidate's full text when title and
      description are insufficient to judge.
      A short snippet and hero image are derived mechanically from each post for
      display. A Masonry grid renders the curated tiles with images, titles, author
      metadata, and read-state dimming.

      Clicking a tile opens the PostArticle detail surface via the deck's layout
      dispatch, routing to the appropriate location (complementary drawer, sibling
      plank, or deck companion) based on the current layout mode. The schema also
      scaffolds a future tagging feature — posts carry an optional tags array and
      the tile renders a tag row when tags are present — enabling navigation and
      feed-discovery flows in a later revision.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-magazine',
    icon: { key: 'ph--book-open-text--regular', hue: 'orange' },
    spec: 'PLUGIN.mdl',
    tags: ['alpha'],
  },
  modules: [
    AppCapability.appGraphBuilder(
      () => import('./src/capabilities/app-graph-builder.ts', { with: { type: 'module-url' } }),
      {
        environments: ['browser', 'tauri'],
        requires: [AttentionCapabilities.ViewState],
      },
    ),
    SpaceCapability.createObject(() => import('./src/capabilities/create-object.ts', { with: { type: 'module-url' } })),
    AppCapability.operationHandler(
      () => import('./src/capabilities/operation-handler.ts', { with: { type: 'module-url' } }),
      {
        activatesOn: ActivationEvents.Idle,
      },
    ),
    AppCapability.pluginAsset({
      pluginId: MagazineNamespace.key,
      path: 'PLUGIN.mdl',
      content: () => import('./PLUGIN.mdl?raw', { with: { type: 'module-url' } }),
      mimeType: 'application/x-mdl',
    }),
    AppCapability.surface(() => import('./src/capabilities/react-surface.ts', { with: { type: 'module-url' } }), {
      roles: [AppRole.Article, AppRole.CardContent, AppRole.ObjectProperties],
    }),
    Capability.lazyModule(
      'RoutineTemplates',
      { provides: [RoutineCapabilities.Template], activatesOn: RoutineEvents.Start },
      () => import('./src/capabilities/routine-templates.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.schema(() => import('./src/capabilities/schema.ts', { with: { type: 'module-url' } })),
    AppCapability.skillDefinition(
      () => import('./src/capabilities/skill-definition.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.spaceTemplates(
      () => import('./src/capabilities/space-templates.ts', { with: { type: 'module-url' } }),
    ),
    // Startup rather than the default dependency-mode gate: the consumers read the capability set
    // (`capabilities.getAll`) instead of declaring it as a requirement, so nothing would ever demand it
    // and a Post would stay unreadable — no reading companion, no extraction.
    AppCapability.textContent(() => import('./src/capabilities/text-content.ts', { with: { type: 'module-url' } }), {
      activatesOn: ActivationEvents.Startup,
    }),
    AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'module-url' } })),
  ],
});

export const { meta, make } = config;

export default config;
