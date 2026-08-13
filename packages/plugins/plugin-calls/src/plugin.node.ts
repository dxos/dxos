//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { meta } from '#meta';
import { translations } from '#translations';

/**
 * Headless variant of CallsPlugin (no React surfaces). Used in node contexts
 * (CLI, agents) where rendering is unavailable.
 */
export const CallsPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AppCapability.translations(translations)),
  Plugin.make,
);

export default CallsPlugin;
