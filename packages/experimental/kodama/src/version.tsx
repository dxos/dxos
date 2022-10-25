//
// Copyright 2022 DXOS.org
//

import { Box, Text, render } from 'ink';
import React from 'react';

export const showVersion = (name: string, version: string) => {
  render(
    <Box
      flexDirection='column'
      margin={1}
      padding={1}
      borderStyle='double'
      borderColor='red'
    >
      <Text>New version: {version}</Text>
      <Text>
        Update: <Text color='yellow'>npm -g up {name}</Text> or{' '}
        <Text color='yellow'>yarn global upgrade {name}</Text>
      </Text>
    </Box>
  );
};
