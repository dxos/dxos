//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { meta } from '#meta';
import { Score } from '#types';

export const SequencerPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AppCapability.schema([Score.Score])),
  Plugin.make,
);

export default SequencerPlugin;
