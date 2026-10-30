//
// Copyright 2023 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as GameCapabilities from '@dxos/plugin-game/GameCapabilities';
import * as GameEvents from '@dxos/plugin-game/GameEvents';
import { trim } from '@dxos/util';

import { ChessNamespace } from './src/namespace.ts';
import * as ChessOperation from './src/types/ChessOperation.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: ChessNamespace.key,
    name: 'Chess',
    author: 'DXOS',
    description: trim`
      Full-featured chess game supporting multiplayer matches with friends or practice sessions against AI opponents.
      Track game history and analyze moves in real-time.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-chess',
    icon: { key: 'ph--shield-chevron--regular', hue: 'amber' },
    spec: 'PLUGIN.mdl',
    tags: ['alpha', 'game'],
    screenshots: [
      { dark: 'https://media.dxos.network/plugin-details-chess-dark.png' },
      { light: 'https://assets.composer.space/demos/2026-10-16-plugin-chess.mp4?v=036db780' },
    ],
    dependsOn: ['org.dxos.plugin.game'],
  },
  modules: [
    AppCapability.schema(() => import('./src/capabilities/schema.ts', { with: { type: 'module-url' } })),
    AppCapability.skillDefinition(
      () => import('./src/capabilities/skill-definition.ts', { with: { type: 'module-url' } }),
      { environments: ['browser', 'node', 'tauri'] },
    ),
    // Browser-only: the variant descriptor carries the `card`/`article` React components the game
    // host renders, so the module cannot load without a DOM.
    Capability.lazyModule(
      'GameVariant',
      {
        provides: [GameCapabilities.VariantProvider],
        activatesOn: GameEvents.Start,
        environments: ['browser', 'tauri'],
      },
      () => import('./src/capabilities/game-variant.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.operationHandler(
      OperationHandlerSet.lazy([
        ChessOperation.Move.pipe(
          Operation.lazyHandler(() => import('./src/operations/move.ts', { with: { type: 'module-url' } })),
        ),
        ChessOperation.Play.pipe(
          Operation.lazyHandler(() => import('./src/operations/play.ts', { with: { type: 'module-url' } })),
        ),
        ChessOperation.Print.pipe(
          Operation.lazyHandler(() => import('./src/operations/print.ts', { with: { type: 'module-url' } })),
        ),
        ChessOperation.RebuildPositionIndex.pipe(
          Operation.lazyHandler(
            () => import('./src/operations/rebuild-position-index.ts', { with: { type: 'module-url' } }),
          ),
        ),
      ]),
      { activatesOn: ActivationEvents.Idle },
    ),
    Capability.lazyModule(
      'plugin-asset',
      {
        provides: [AppCapabilities.PluginAsset],
        activatesOn: ActivationEvents.PluginAssetsRequested,
        environments: ['browser', 'tauri'],
      },
      () => import('./src/capabilities/plugin-asset.ts', { with: { type: 'module-url' } }),
    ),
    Capability.lazyModule(
      'translations',
      { provides: [AppCapabilities.Translations], environments: ['browser', 'node', 'tauri', 'workerd'] },
      () => import('./src/capabilities/translations.ts', { with: { type: 'module-url' } }),
    ),
  ],
});

export const { meta, make, operations } = config;

export default config;
