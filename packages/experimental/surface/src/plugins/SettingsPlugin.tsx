//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { PluginBase } from '../framework';

// TODO(burdon): Display config.
const SettingsPanel = () => {
  return <h1>Settings</h1>;
};

export class SettingsPlugin extends PluginBase {
  constructor() {
    super('org.dxos.settings', {
      main: SettingsPanel
    });
  }
}
