//
// Copyright 2023 DXOS.org
//

import { Asterisk, type IconProps } from '@phosphor-icons/react';
import React from 'react';

import { pluginMeta } from '@dxos/app-framework';

export const TEMPLATE_PLUGIN = 'dxos.org/plugin/template';

export default pluginMeta({
  id: TEMPLATE_PLUGIN,
  name: 'Template',
  iconComponent: (props: IconProps) => <Asterisk {...props} />,
});
