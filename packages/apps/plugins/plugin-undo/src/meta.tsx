//
// Copyright 2023 DXOS.org
//

import { ArrowsCounterClockwise, type IconProps } from '@phosphor-icons/react';
import React from 'react';

import { pluginMeta } from '@dxos/app-framework';

export const UNDO_PLUGIN = 'dxos.org/plugin/undo';

export default pluginMeta({
  id: UNDO_PLUGIN,
  name: 'Undo',
  iconComponent: (props: IconProps) => <ArrowsCounterClockwise {...props} />,
});
