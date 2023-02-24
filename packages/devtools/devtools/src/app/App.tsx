//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { useRemoteClient } from '../hooks';
import { Devtools } from './Devtools';

export const App = () => {
  const client = useRemoteClient();

  return <Devtools client={client} />;
};
