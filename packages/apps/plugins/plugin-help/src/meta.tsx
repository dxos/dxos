//
// Copyright 2023 DXOS.org
//

import { Info, type IconProps } from '@phosphor-icons/react';
import React from 'react';

import { pluginMeta } from '@dxos/app-framework';

// TODO(burdon): Rename Guide? Help?
export const HELP_PLUGIN = 'dxos.org/plugin/help';

export default pluginMeta({
  id: HELP_PLUGIN,
  name: 'Help',
  iconComponent: (props: IconProps) => <Info {...props} />,
});

const HELP_ACTION = `${HELP_PLUGIN}/action`;
export enum HelpAction {
  START = `${HELP_ACTION}/start`,
}
