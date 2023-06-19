//
// Copyright 2023 DXOS.org
//
// import React from 'react';

import React from 'react';

import { definePlugin, PluginDefinition } from '@dxos/react-surface';

import { OctokitProvider, PatInput } from './components';

export const GithubPlugin: PluginDefinition = definePlugin({
  meta: {
    id: 'dxos:GithubPlugin',
  },
  provides: {
    context: (props) => <OctokitProvider {...props} />,
    component: (datum, role) => {
      if (role === 'dialog' && datum === 'dxos:SplitViewPlugin/ProfileSettings') {
        return PatInput;
      } else {
        return null;
      }
    },
  },
});
