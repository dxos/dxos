//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Devtools } from '@dxos/devtools';
import { ClientServices, useClient } from '@dxos/react-client';

export const DevtoolsMain = () => {
  const client = useClient();

  return (
    <div className='mbs-12'>
      <Devtools client={client} services={client.services.services as ClientServices} />
    </div>
  );
};
