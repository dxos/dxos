//
// Copyright 2021 DXOS.org
//

import { Box } from '@mui/material';
import React from 'react';

import { ClientInitializer, useProfile } from '@dxos/react-client';
import { JsonTreeView } from '@dxos/react-framework';

import { Registration as RegistrationDialog } from '../../src';

/**
 * Registration and profile recovery.
 */
export const Registration = () => {
  const App = () => {
    const profile = useProfile();

    if (profile) {
      return (
        <Box m={2}>
          <JsonTreeView data={profile} />
        </Box>
      );
    }

    return (
      <>
        <Box m={2}>
          <RegistrationDialog />
        </Box>
      </>
    );
  };

  return (
    <ClientInitializer>
      <App />
    </ClientInitializer>
  );
};

export default {
  title: 'Tutorials/Registration',
  component: Registration
};
