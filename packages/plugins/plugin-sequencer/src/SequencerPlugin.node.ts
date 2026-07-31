//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';

import { meta } from '#meta';
import { Score } from '#types';

export const SequencerPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AppCapability.schema([Score.Score])),
  Plugin.make,
);

export default SequencerPlugin;
