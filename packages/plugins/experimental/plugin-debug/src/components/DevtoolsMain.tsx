//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Devtools } from '@dxos/devtools';
import { useClient, type ClientServices } from '@dxos/react-client';

const DevtoolsMain = () => {
  const client = useClient();

  return <Devtools client={client} services={client.services.services as ClientServices} />;
};

export default DevtoolsMain;
