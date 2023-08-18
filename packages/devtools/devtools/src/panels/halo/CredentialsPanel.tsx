//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { Toolbar } from '@dxos/aurora';

import { JsonView, PanelContainer } from '../../components';
import { SpaceSelector } from '../../containers';
import { useDevtoolsState, useCredentials } from '../../hooks';

// TODO(burdon): Blows up since JSON data is too large.

const CredentialsPanel = () => {
  const { space } = useDevtoolsState();
  const credentials = useCredentials({ spaceKey: space?.key });

  return (
    <PanelContainer
      toolbar={
        <Toolbar.Root>
          <SpaceSelector />
        </Toolbar.Root>
      }
    >
      <JsonView data={credentials} />
    </PanelContainer>
  );
};

export default CredentialsPanel;
