//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Devtools } from '@dxos/devtools';
import { useClient, type ClientServices } from '@dxos/react-client';

const DevtoolsArticle = () => {
  const client = useClient();

  return (
    <div role='none' className='row-span-2 rounded-t-md overflow-x-auto'>
      <Devtools client={client} services={client.services.services as ClientServices} />
    </div>
  );
};

export default DevtoolsArticle;
