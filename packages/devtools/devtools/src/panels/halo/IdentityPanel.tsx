//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { useDevices, useIdentity } from '@dxos/react-client';

import { JsonView, PanelContainer } from '../../components';

// TODO(burdon): Implement table.
const IdentityPanel = () => {
  const identity = useIdentity();
  const devices = useDevices();

  return (
    <PanelContainer>
      <JsonView data={{ ...identity, devices }} />
    </PanelContainer>
  );
};

export default IdentityPanel;
