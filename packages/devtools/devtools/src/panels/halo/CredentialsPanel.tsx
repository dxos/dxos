//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { JsonView } from '../../components';
import { SpaceToolbar } from '../../containers';
import { useDevtoolsState, useCredentials } from '../../hooks';

// TODO(burdon): Blows up since JSON data is too large.

const CredentialsPanel = () => {
  const { space } = useDevtoolsState();
  const credentials = useCredentials({ spaceKey: space?.key });

  return (
    <div className='flex flex-1 flex-col overflow-hidden'>
      <SpaceToolbar />

      <JsonView className='flex flex-1 overflow-auto ml-2 mt-2' data={credentials} />
    </div>
  );
};

export default CredentialsPanel;
