//
// Copyright 2023 DXOS.org
//

import { CompassTool } from '@phosphor-icons/react';
import React from 'react';

import { pluginMeta } from '@dxos/app-framework';

export const SKETCH_PLUGIN = 'dxos.org/plugin/sketch';

export default pluginMeta({
  id: SKETCH_PLUGIN,
  name: 'Sketch',
  iconComponent: (props) => <CompassTool {...props} />,
});
