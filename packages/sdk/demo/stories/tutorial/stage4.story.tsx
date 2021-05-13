//
// Copyright 2021 DXOS.org
//

import faker from 'faker';
import React from 'react';

import { Box, Button, Grid, Toolbar } from '@material-ui/core';

import { createKeyPair } from '@dxos/crypto';
import { ClientInitializer, useClient, useParties, useProfile } from '@dxos/react-client';

import { Registration } from '../../src';
import { JsonTreeView } from '@dxos/react-ux';

/**
 * Walk through the registration flow
 */
export const Stage4 = () => {
  const App = () => {
    const profile = useProfile();

    if (!!profile) {
      return (
        <Box m={2}>
          <JsonTreeView data={profile} />
        </Box>
      )
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
