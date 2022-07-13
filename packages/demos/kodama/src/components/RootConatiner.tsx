//
// Copyright 2022 DXOS.org
//

import { Box } from 'ink';
import React, { FC, ReactNode } from 'react';

/**
 * Root container
 */
export const RootContainer: FC<{
  toolbar: ReactNode,
  children: ReactNode
}> = ({
  toolbar,
  children
}) => {
  return (
    <Box flexDirection='column'>
      {toolbar}
      {children}
    </Box>
  );
};
