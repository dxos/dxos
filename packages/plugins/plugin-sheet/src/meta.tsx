//
// Copyright 2023 DXOS.org
//

import { GridNine, type IconProps } from '@phosphor-icons/react';
import React from 'react';

import { pluginMeta } from '@dxos/app-framework';

export const SHEET_PLUGIN = 'dxos.org/plugin/sheet';

export default pluginMeta({
  id: SHEET_PLUGIN,
  name: 'Sheet',
  description: 'A simple spreadsheet plugin.',
  iconComponent: (props: IconProps) => <GridNine {...props} />,
  iconSymbol: 'ph--grid-nine--regular',
});
