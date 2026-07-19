//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';

import { meta } from '#meta';
import { translations } from '#translations';
import { Game } from '#types';

/**
 * Headless variant of GamePlugin (no React surfaces / CreateObject panel).
 * Used in node contexts (CLI, agents, tests) where rendering is unavailable —
 * the full variant lazy-loads `CreateGamePanel` from `react-ui-search` which
 * downstream bundlers don't resolve cleanly under nested pnpm symlinks.
 */
export const GamePlugin = Plugin.define(meta).pipe(
  Plugin.addLazyModule(AppCapability.schema([Game.Game])),
  Plugin.addLazyModule(AppCapability.translations(translations)),
  Plugin.make,
);

export default GamePlugin;
