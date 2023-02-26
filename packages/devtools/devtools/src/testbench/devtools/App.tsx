//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Devtools } from '../../app';
import { useProxiedClient } from '../../hooks';

export const App = () => {
  const client = useProxiedClient();
  if (!client) {
    return null;
  }

  return <Devtools context={client} />;
};
