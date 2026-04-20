//
// Copyright 2026 DXOS.org
//

/**
 * Packages shared between the Composer host app and remote plugins.
 *
 * Rule: every `@dxos/*` package EXCEPT `@dxos/plugin-*` is provided by the host
 * via import map and must NOT be re-bundled into a plugin's module. Plugin packages
 * are intentionally excluded so that community plugins can depend on each other
 * for lightweight types/operation defs (which are small and safe to duplicate
 * between bundles).
 *
 * The explicit list below drives `importMapPlugin` (it needs concrete specifiers
 * to emit wrapper chunks). `composerPlugin` and `isSharedPackage` use the
 * predicate form for externalization so newly-added @dxos packages are handled
 * automatically without a code change on every plugin.
 */
/**
 * Non-`@dxos/*` packages the Composer host provides to plugins via import map.
 * Spread into {@link DEFAULT_PACKAGES} and consulted by {@link isSharedPackage}
 * so the third-party set lives in exactly one place.
 */
const THIRD_PARTY_SHARED_PACKAGES = [
  '@effect-atom/atom',
  '@effect-atom/atom-react',
  '@effect/platform',
  'effect',
  'lit',
  'react',
  'react-dom',
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

  // packages/core
  '@dxos/ai',
  '@dxos/assistant',
  '@dxos/assistant-toolkit',
  '@dxos/blueprints',
  '@dxos/compute',
  '@dxos/conductor',
  '@dxos/echo',
  '@dxos/functions',
  '@dxos/functions-runtime',
  '@dxos/mcp-client',
  '@dxos/operation',
  '@dxos/protocols',

  // packages/sdk
  '@dxos/app-framework',
  '@dxos/app-graph',
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
  '@dxos/ui',
  '@dxos/ui-editor',
  '@dxos/ui-theme',
  '@dxos/ui-types',

  // third-party
  ...THIRD_PARTY_SHARED_PACKAGES,
];

/**
 * True when the given bare specifier (or one of its subpaths) is provided by
 * the Composer host at runtime and must not be re-bundled by a plugin.
 *
 * The rule: every `@dxos/*` package except `@dxos/plugin-*` is shared.
 * Plugin packages (`@dxos/plugin-markdown`, `@dxos/plugin-space`, …) are
 * intentionally NOT shared — community plugins bundle their own copy of any
 * plugin-subpath they import, which is safe because those exports are limited
 * to lightweight types/operation defs.
 */
export const isSharedPackage = (id: string): boolean => {
  if (id.startsWith('@dxos/')) {
    return !id.startsWith('@dxos/plugin-');
  }
  return THIRD_PARTY_SHARED_PACKAGES.some((pkg) => id === pkg || id.startsWith(`${pkg}/`));
};
