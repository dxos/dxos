//
// Copyright 2023 DXOS.org
//

import { CompassTool, type IconProps } from '@phosphor-icons/react';
import React from 'react';

import { pluginMeta } from '@dxos/app-framework';

export const SKETCH_PLUGIN = 'dxos.org/plugin/excalidraw';

export default pluginMeta({
  id: SKETCH_PLUGIN,
  name: 'Excalidraw',
  description: 'Diagramming tool.',
  iconComponent: (props: IconProps) => <CompassTool {...props} />,
  iconSymbol: 'ph--compass-tool--regular',
});
