//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Devtools } from '../../app';
import { useProxiedClient } from '../../hooks';

export const App = () => {
  const context = useProxiedClient();
  if (!context) {
    return null;
  }

  return <Devtools context={context} />;
};
