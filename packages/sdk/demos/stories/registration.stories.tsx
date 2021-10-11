//
// Copyright 2021 DXOS.org
//

import { Box } from '@mui/material';
import React from 'react';

import { ClientInitializer, useProfile } from '@dxos/react-client';

import { JsonTreeView } from '@dxos/react-framework';

// TODO(burdon): Which package should this be in?
// import { RegistrationDialog } from '../src';

export default {
  title: 'Tutorials/Registration'
};

/**
 * Registration and profile recovery.
 */
export const Primary = () => {
  const App = () => {
    const profile = useProfile();

    if (profile) {
      return (
        <Box m={2}>
          <JsonTreeView data={profile} />
        </Box>
      );
    }

    return null;

    // TODO(burdon): Set defaults.
    /*
    return (
      <>
        <Box m={2}>
          <RegistrationDialog/>
        </Box>
      </>
    );
    */
  };

  return (
    <ClientInitializer>
      <App />
    </ClientInitializer>
  );
};
