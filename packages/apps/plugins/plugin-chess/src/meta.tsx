//
// Copyright 2023 DXOS.org
//

import { ShieldChevron, type IconProps } from '@phosphor-icons/react';
import React from 'react';

import { pluginMeta } from '@dxos/app-framework';

export const CHESS_PLUGIN = 'dxos.org/plugin/chess';

export default pluginMeta({
  id: CHESS_PLUGIN,
  name: 'Chess',
  iconComponent: (props: IconProps) => <ShieldChevron {...props} />,
});
