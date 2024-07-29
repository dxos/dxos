//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Devtools } from '@dxos/devtools';
import { useClient, type ClientServices } from '@dxos/react-client';
import { Main } from '@dxos/react-ui';
import {
  baseSurface,
  topbarBlockPaddingStart,
  fixedInsetFlexLayout,
  bottombarBlockPaddingEnd,
} from '@dxos/react-ui-theme';

const DevtoolsMain = ({ role }: { role: 'article' | 'main' }) => {
  const client = useClient();

  return role === 'article' ? (
    <div role='none' className='row-span-2 rounded-t-md overflow-x-auto'>
      <Devtools client={client} services={client.services.services as ClientServices} />
    </div>
  ) : (
    <Main.Content classNames={[baseSurface, fixedInsetFlexLayout, topbarBlockPaddingStart, bottombarBlockPaddingEnd]}>
      <Devtools client={client} services={client.services.services as ClientServices} />
    </Main.Content>
  );
};

export default DevtoolsMain;
