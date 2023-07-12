//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { JsonView, PanelContainer, Toolbar } from '../../components';
import { SpaceSelector } from '../../containers';
import { useDevtoolsState, useCredentials } from '../../hooks';

// TODO(burdon): Blows up since JSON data is too large.

const CredentialsPanel = () => {
  const { space } = useDevtoolsState();
  const credentials = useCredentials({ spaceKey: space?.key });

  return (
    <PanelContainer
      toolbar={
        <Toolbar>
          <SpaceSelector />
        </Toolbar>
      }
    >
      <JsonView data={credentials} />
    </PanelContainer>
  );
};

export default CredentialsPanel;
