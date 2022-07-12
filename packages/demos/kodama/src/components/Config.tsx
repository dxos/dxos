//
// Copyright 2022 DXOS.org
//

import { Box, Text } from 'ink';
import React from 'react';

import { useConfig } from '@dxos/react-client';

export const Config = () => {
  const config = useConfig();

  return (
    <Box flexDirection='column' borderStyle='single' borderColor='#333'>
      <Text color='green'>
        {JSON.stringify(config.values, undefined, 2)}
      </Text>
    </Box>
  );
};
