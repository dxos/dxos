//
// Copyright 2023 DXOS.org
//

import { GithubLogo } from '@phosphor-icons/react';
import React from 'react';

import { pluginMeta } from '@dxos/app-framework';

export const GITHUB_PLUGIN = 'dxos.org/plugin/github';
export const GITHUB_PLUGIN_SHORT_ID = 'github';

export default pluginMeta({
  id: GITHUB_PLUGIN,
  shortId: GITHUB_PLUGIN_SHORT_ID,
  name: 'Github',
  iconComponent: (props) => <GithubLogo {...props} />,
});
