//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Plugin } from '../framework';

const Settings = () => {
  return <h1>Settings</h1>;
};

export const SettingsPlugin: Plugin = {
  id: 'org.dxos.settings',
  components: { settings: Settings }
};
