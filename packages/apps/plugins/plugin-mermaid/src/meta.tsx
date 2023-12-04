//
// Copyright 2023 DXOS.org
//

import { AnchorSimple, type IconProps } from '@phosphor-icons/react';
import React from 'react';

import { pluginMeta } from '@dxos/app-framework';

export const MERMAID_PLUGIN = 'dxos.org/plugin/mermaid';

export default pluginMeta({
  id: MERMAID_PLUGIN,
  name: 'Mermaid',
  iconComponent: (props: IconProps) => <AnchorSimple {...props} />,
});
