//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

import { meta } from '#meta';
import { Song } from '#types';

export const SequencerPlugin = Plugin.define(meta).pipe(
  AppPlugin.addSchemaModule({ schema: [Song.Song] }),
  Plugin.make,
);

export default SequencerPlugin;
