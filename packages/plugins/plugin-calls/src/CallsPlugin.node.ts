//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';

import { meta } from '#meta';
import { translations } from '#translations';

/**
 * Headless variant of CallsPlugin (no React surfaces). Used in node contexts
 * (CLI, agents) where rendering is unavailable.
 */
export const CallsPlugin = Plugin.define(meta).pipe(
  Plugin.addLazyModule(AppCapability.translations(translations)),
  Plugin.make,
);

export default CallsPlugin;
