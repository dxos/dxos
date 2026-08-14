//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { Schema } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';

/**
 * Headless variant of GamePlugin (no React surfaces / CreateObject panel).
 * Used in node contexts (CLI, agents, tests) where rendering is unavailable —
 * the full variant lazy-loads `CreateGamePanel` from `react-ui-search` which
 * downstream bundlers don't resolve cleanly under nested pnpm symlinks.
 */
export const GamePlugin = Plugin.define(meta).pipe(
  Plugin.addModule(Schema),
  Plugin.addModule(AppCapability.translations(translations)),
  Plugin.make,
);

export default GamePlugin;
