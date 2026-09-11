//
// Copyright 2025 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { ReactContext, Settings, Translator } from '#capabilities';
import { meta } from '#meta';

import { type ThemePluginOptions } from './react-context.tsx';

export const ThemePlugin = Plugin.define<ThemePluginOptions>(meta).pipe(
  Plugin.addModule(ReactContext),
  Plugin.addModule(Settings),
  Plugin.addModule(Translator),
  Plugin.make,
);

export default ThemePlugin;
