//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Devtools } from '@dxos/devtools';
import { useClient } from '@dxos/react-client';

const DevtoolsMain = () => {
  const client = useClient();
  return <Devtools client={client} />;
};

export default DevtoolsMain;
