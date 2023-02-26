//
// Copyright 2022 DXOS.org
//

import { Box } from 'ink';
import React, { FC, ReactNode } from 'react';

/**
 * Focusable panel.
 */
export const Panel: FC<{
  highlight?: boolean;
  children: ReactNode;
}> = ({ highlight, children }) => {
  return (
    <Box
      flexDirection='column'
      flexGrow={1}
      paddingLeft={1}
      paddingRight={1}
      borderStyle='single'
      borderColor={highlight ? 'green' : '#666'}
    >
      {children}
    </Box>
  );
};
