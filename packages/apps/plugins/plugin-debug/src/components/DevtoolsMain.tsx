//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Devtools } from '@dxos/devtools';
import { type ClientServices, useClient } from '@dxos/react-client';
import { Main } from '@dxos/react-ui';
import {
  baseSurface,
  topbarBlockPaddingStart,
  fixedInsetFlexLayout,
  bottombarBlockPaddingEnd,
} from '@dxos/react-ui-theme';

const DevtoolsMain = () => {
  const client = useClient();

  return (
    <Main.Content classNames={[baseSurface, fixedInsetFlexLayout, topbarBlockPaddingStart, bottombarBlockPaddingEnd]}>
      <Devtools client={client} services={client.services.services as ClientServices} />
    </Main.Content>
  );
};

export default DevtoolsMain;
