//
// Copyright 2022 DXOS.org
//

import { Box } from 'ink';
import React, { FC, ReactNode } from 'react';

/**
 * Panel
 */
export const Panel: FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <Box
      flexDirection='column'
      flexGrow={1}
      paddingLeft={1}
      paddingRight={1}
      marginTop={1}
      marginBottom={1}
      borderStyle='single'
      borderColor='#666'
    >
      {children}
    </Box>
  );
};
