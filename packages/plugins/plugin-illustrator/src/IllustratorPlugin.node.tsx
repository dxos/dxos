//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

import { OperationHandler, SkillDefinition } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { Sketch } from '#types';

/**
 * Headless variant of IllustratorPlugin (no React surfaces / CreateObject panel).
 * Used in node contexts (CLI, agents, tests) where rendering is unavailable —
 * the full variant lazy-loads `CreateSketchPanel` from `react-ui-search` which
 * downstream bundlers don't resolve cleanly under nested pnpm symlinks.
 */
export const IllustratorPlugin = Plugin.define(meta).pipe(
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSchemaModule({ schema: [Sketch.Sketch] }),
  AppPlugin.addSkillDefinitionModule({ activate: SkillDefinition }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);

export default IllustratorPlugin;
