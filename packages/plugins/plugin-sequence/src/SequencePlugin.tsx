//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

import { ReactSurface } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { Song } from '#types';

export const SequencePlugin = Plugin.define(meta).pipe(
  AppPlugin.addSchemaModule({ schema: [Song.Song] }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);

export default SequencePlugin;
