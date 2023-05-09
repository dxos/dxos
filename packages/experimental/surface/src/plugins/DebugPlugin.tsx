//
// Copyright 2023 DXOS.org
//

import React from 'react';
import { useLocation, useParams } from 'react-router-dom';

import { useConfig } from '@dxos/react-client';

import { Plugin } from '../framework';

const DebugPanel = () => {
  const config = useConfig();
  const location = useLocation();
  const params = useParams();

  return <pre>{JSON.stringify({ config: config.values, router: { location, params } }, undefined, 2)}</pre>;
};

export class DebugPlugin extends Plugin {
  constructor() {
    super({
      id: 'org.dxos.debug',
      components: {
        main: DebugPanel
      }
    });
  }
}
