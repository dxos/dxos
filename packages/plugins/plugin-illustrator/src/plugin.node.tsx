//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { OperationHandler, Schema, SkillDefinition } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';

/**
 * Headless variant of IllustratorPlugin (no React surfaces / CreateObject panel).
 * Used in node contexts (CLI, agents, tests) where rendering is unavailable —
 * the full variant lazy-loads `CreateDrawingPanel` from `react-ui-search` which
 * downstream bundlers don't resolve cleanly under nested pnpm symlinks.
 */
export const IllustratorPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(OperationHandler),
  Plugin.addModule(Schema),
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(AppCapability.translations(translations)),
  Plugin.make,
);

export default IllustratorPlugin;
