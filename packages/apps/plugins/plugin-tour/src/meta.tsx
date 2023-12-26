//
// Copyright 2023 DXOS.org
//

import { Info, type IconProps } from '@phosphor-icons/react';
import React from 'react';

import { pluginMeta } from '@dxos/app-framework';

// TODO(burdon): Rename Guide? Help?
export const TOUR_PLUGIN = 'dxos.org/plugin/tour';

export default pluginMeta({
  id: TOUR_PLUGIN,
  name: 'Tour',
  iconComponent: (props: IconProps) => <Info {...props} />,
});
