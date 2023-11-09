//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Devtools } from '@dxos/devtools';
import { type ClientServices, useClient } from '@dxos/react-client';
import { Main } from '@dxos/react-ui';
import { baseSurface, coarseBlockPaddingStart, fixedInsetFlexLayout } from '@dxos/react-ui-theme';

export const DevtoolsMain = () => {
  const client = useClient();

  return (
    <Main.Content classNames={[baseSurface, fixedInsetFlexLayout, coarseBlockPaddingStart]}>
      <Devtools client={client} services={client.services.services as ClientServices} />
    </Main.Content>
  );
};
