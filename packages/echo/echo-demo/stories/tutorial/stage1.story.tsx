//
// Copyright 2021 DXOS.org
//

import React from 'react';

import { Box, Typography } from '@material-ui/core';

// TODO(burdon): Rename ClientProvider?
import { ClientInitializer } from '../../src';

export default {
  title: 'Tutorials/Stage 1'
};

// TODO(burdon): Use storybook extensions to create documentation.
// TODO(burdon): Reuse components from demo/client provider (party cards).

// 1 profile
// 2 party
// 3 party items

/**
 * Creates a user profile.
 */
export const Stage1 = () => {
  return (
    <Box>
      <ClientInitializer>
        <Typography>Stage 1</Typography>
      </ClientInitializer>
    </Box>
  );
};
