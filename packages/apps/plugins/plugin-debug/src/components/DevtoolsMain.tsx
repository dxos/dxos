//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Main } from '@dxos/aurora';
import { baseSurface, coarseBlockPaddingStart, fixedInsetFlexLayout } from '@dxos/aurora-theme';
import { Devtools } from '@dxos/devtools';
import { ClientServices, useClient } from '@dxos/react-client';

export const DevtoolsMain = () => {
  const client = useClient();

  return (
    <Main.Content classNames={[baseSurface, fixedInsetFlexLayout, coarseBlockPaddingStart]}>
      <Devtools client={client} services={client.services.services as ClientServices} />
    </Main.Content>
  );
};

export default DevtoolsMain;
