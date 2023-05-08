//
// Copyright 2023 DXOS.org
//

import React from 'react';
import { useLocation, useParams } from 'react-router-dom';

import { Plugin, useAppState } from '../framework';

const DebugInfo = () => {
  const location = useLocation();
  const params = useParams();
  const state = useAppState();

  return <pre>{JSON.stringify({ router: { location, params }, state }, undefined, 2)}</pre>;
};

export const DebugPlugin: Plugin = {
  id: 'org.dxos.debug',
  components: { debug: DebugInfo }
};
