//
// Copyright 2022 DXOS.org
//

import { Box } from 'ink';
import SyntaxHighlight from 'ink-syntax-highlight';
import React from 'react';

import { useConfig } from '@dxos/react-client';

export const Config = () => {
  const config = useConfig();

  return (
    <Box flexDirection='column'>
      <SyntaxHighlight language='json' code={JSON.stringify(config.values, undefined, 2)} />
    </Box>
  );
};
