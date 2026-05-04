//
// Copyright 2026 DXOS.org
//

/**
 * Packages shared between the Composer host app and remote plugins.
 *
 * {@link DEFAULT_PACKAGES} is the single source of truth: `importMapPlugin` emits
 * one wrapper chunk per entry so the host serves it at runtime, and `composerPlugin`
 * (via {@link isSharedPackage}) externalizes the same set from plugin bundles.
 * Adding a new `@dxos/*` (or third-party) package that plugins may depend on means
 * adding it here — in one place — so the externalization contract stays in sync
 * with what the host actually provides.
 *
 * Plugin packages (`@dxos/plugin-*`) are intentionally NOT listed: community plugins
 * bundle their own copy of any plugin-subpath import, which is safe because those
 * exports are limited to lightweight types/operation defs.
 */

/**
 * Non-`@dxos/*` packages the Composer host provides to plugins via import map.
 * Spread into {@link DEFAULT_PACKAGES} so the third-party set lives in one place.
 */
const THIRD_PARTY_SHARED_PACKAGES = [
  '@effect-atom/atom',
  '@effect-atom/atom-react',
  '@effect/platform',
  'effect',
  'lit',
  'react',
  'react-dom',
  'solid-js',
];

export const DEFAULT_PACKAGES = [
  // packages/common
  '@dxos/async',
  '@dxos/codec-protobuf',
  '@dxos/context',
  '@dxos/crypto',
  '@dxos/debug',
  '@dxos/display-name',
  '@dxos/effect',
  '@dxos/effect-atom-solid',
  '@dxos/errors',
  '@dxos/feed-store',
  '@dxos/graph',
  '@dxos/hypercore',
  '@dxos/invariant',
  '@dxos/keyboard',
  '@dxos/keys',
  '@dxos/kv-store',
  '@dxos/log',
  '@dxos/merkle-search-tree',
  '@dxos/random',
  '@dxos/random-access-storage',
  '@dxos/timeframe',
  '@dxos/tracing',
  '@dxos/util',
  '@dxos/web-context',
  '@dxos/web-context-react',
  '@dxos/web-context-solid',

  // packages/core/echo
  '@dxos/echo',
  '@dxos/echo-atom',
  '@dxos/echo-db',
  '@dxos/echo-pipeline',
  '@dxos/echo-protocol',
  '@dxos/echo-query',
  '@dxos/echo-react',
  '@dxos/echo-solid',
  '@dxos/feed',
  '@dxos/index-core',

  // packages/core/halo
  '@dxos/credentials',
  '@dxos/keyring',

  // packages/core/mesh
  '@dxos/edge-client',
  '@dxos/messaging',
  '@dxos/network-manager',
  '@dxos/rpc',
  '@dxos/rpc-tunnel',
  '@dxos/teleport',
  '@dxos/teleport-extension-automerge-replicator',
  '@dxos/teleport-extension-gossip',
  '@dxos/teleport-extension-object-sync',
  '@dxos/teleport-extension-replicator',
  '@dxos/websocket-rpc',

  // packages/core
  // `@dxos/blueprints`, `@dxos/functions`, and `@dxos/operation` are umbrella'd by
  // `@dxos/compute` (which re-exports them) and composer-app no longer takes a direct
  // dep on the underlying packages — listing them here would make `composerPlugin`
  // externalize the bare specifier in plugin bundles while the host never publishes a
  // corresponding import-map entry, producing a runtime `Failed to resolve module
  // specifier` at install time. Plugins that still import them directly should migrate
  // to `@dxos/compute`. `@dxos/functions-runtime` is similarly absent because it is
  // not a host dep; add it back here only if composer-app starts importing it.
  '@dxos/ai',
  '@dxos/assistant',
  '@dxos/assistant-toolkit',
  '@dxos/compute',
  '@dxos/conductor',
  '@dxos/mcp-client',
  '@dxos/protocols',

  // packages/devtools
  '@dxos/devtools',

  // packages/sdk
  '@dxos/app-framework',
  '@dxos/app-graph',
  '@dxos/app-solid',
  '@dxos/app-toolkit',
  '@dxos/client',
  '@dxos/client-protocol',
  '@dxos/client-services',
  '@dxos/config',
  '@dxos/migrations',
  '@dxos/observability',
  '@dxos/react-client',
  '@dxos/react-edge-client',
  '@dxos/schema',
  '@dxos/types',

  // packages/ui
  '@dxos/lit-grid',
  '@dxos/lit-ui',
  '@dxos/react-hooks',
  '@dxos/react-ui',
  '@dxos/react-ui-attention',
  '@dxos/react-ui-board',
  '@dxos/react-ui-calendar',
  '@dxos/react-ui-canvas',
  '@dxos/react-ui-canvas-compute',
  '@dxos/react-ui-canvas-editor',
  '@dxos/react-ui-chat',
  '@dxos/react-ui-components',
  '@dxos/react-ui-dnd',
  '@dxos/react-ui-editor',
  '@dxos/react-ui-form',
  '@dxos/react-ui-gameboard',
  '@dxos/react-ui-geo',
  '@dxos/react-ui-graph',
  '@dxos/react-ui-grid',
  '@dxos/react-ui-list',
  '@dxos/react-ui-markdown',
  '@dxos/react-ui-masonry',
  '@dxos/react-ui-menu',
  '@dxos/react-ui-mosaic',
  '@dxos/react-ui-pickers',
  '@dxos/react-ui-search',
  '@dxos/react-ui-sfx',
  '@dxos/react-ui-stack',
  '@dxos/react-ui-syntax-highlighter',
  '@dxos/react-ui-table',
  '@dxos/react-ui-tabs',
  '@dxos/react-ui-text-tooltip',
  '@dxos/react-ui-thread',
  '@dxos/solid-ui',
  '@dxos/solid-ui-geo',
  '@dxos/ui',
  '@dxos/ui-editor',
  '@dxos/ui-theme',
  '@dxos/ui-types',

  // third-party
  ...THIRD_PARTY_SHARED_PACKAGES,
];

/**
 * True when the given bare specifier (or one of its subpaths) is provided by the
 * Composer host at runtime and must not be re-bundled by a plugin.
 *
 * Matches only packages listed in {@link DEFAULT_PACKAGES} — the same list
 * {@link importMapPlugin} consumes — so externalization cannot claim a package
 * the host isn't actually mapping. Unknown `@dxos/*` packages fall through to
 * normal bundling, which is the correct default for plugin-owned or yet-to-be
 * shared workspace packages.
 */
export const isSharedPackage = (id: string): boolean =>
  DEFAULT_PACKAGES.some((pkg) => id === pkg || id.startsWith(`${pkg}/`));
