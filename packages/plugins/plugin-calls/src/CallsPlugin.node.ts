//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

import { meta } from '#meta';
import { translations } from '#translations';
import { Call } from '#types';

/**
 * Headless variant of CallsPlugin (no React surfaces). Used in node contexts
 * (CLI, agents) where rendering is unavailable.
 */
export const CallsPlugin = Plugin.define(meta).pipe(
  AppPlugin.addSchemaModule({ schema: [Call.Call, Call.CloudflareTransportConfig] }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);

export default CallsPlugin;
