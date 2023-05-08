//
// Copyright 2023 DXOS.org
//

import React from 'react';
import { useLocation, useParams } from 'react-router-dom';

import { useConfig } from '@dxos/react-client';

import { PluginBase, useAppState } from '../framework';

const DebugPanel = () => {
  const config = useConfig();
  const location = useLocation();
  const params = useParams();
  const state = useAppState();

  return <pre>{JSON.stringify({ config: config.values, router: { location, params }, state }, undefined, 2)}</pre>;
};

export class DebugPlugin extends PluginBase {
  constructor() {
    super('org.dxos.debug', {
      main: DebugPanel
    });
  }
}
