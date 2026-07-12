//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

import { meta } from '#meta';

import { translations } from './translations';

export const TypefullyPlugin = Plugin.define(meta).pipe(AppPlugin.addTranslationsModule({ translations }), Plugin.make);

export default TypefullyPlugin;
