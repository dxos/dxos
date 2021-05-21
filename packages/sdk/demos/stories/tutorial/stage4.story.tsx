//
// Copyright 2021 DXOS.org
//

import React from 'react';

import { Box } from '@material-ui/core';

import { ClientInitializer, useProfile } from '@dxos/react-client';
import { JsonTreeView } from '@dxos/react-ux';

import { Registration } from '../../src';

/**
 * Registration and profile recovery.
 */
export const Stage4 = () => {
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
          <Registration />
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
  title: 'Tutorials/Stage 4',
  component: Stage4
};
