//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

import { ReactSurface } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { StackViewType } from '#types';

export const StackPlugin = Plugin.define(meta).pipe(
  AppPlugin.addSchemaModule({ schema: [StackViewType] }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);

export default StackPlugin;
