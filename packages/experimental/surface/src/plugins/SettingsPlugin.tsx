//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Plugin } from '../framework';

// TODO(burdon): Display config.
const Settings = () => {
  return <h1>Settings</h1>;
};

export const SettingsPlugin: Plugin = {
  id: 'org.dxos.settings',
  components: { main: Settings }
};
