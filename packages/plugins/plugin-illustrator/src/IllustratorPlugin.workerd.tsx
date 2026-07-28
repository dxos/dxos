//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

import { meta } from '#meta';
import { Sketch } from '#types';

export const IllustratorPlugin = Plugin.define(meta).pipe(
  AppPlugin.addSchemaModule({ schema: [Sketch.Sketch] }),
  Plugin.make,
);

export default IllustratorPlugin;
