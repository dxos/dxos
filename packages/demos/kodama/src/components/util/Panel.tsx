//
// Copyright 2022 DXOS.org
//

import { Box } from 'ink';
import React, { FC, ReactNode } from 'react';

/**
 * Focusable panel.
 */
export const Panel: FC<{
  focused?: boolean
  children: ReactNode
}> = ({
  focused,
  children
}) => {
  return (
    <Box
      flexDirection='column'
      flexGrow={1}
      paddingLeft={1}
      paddingRight={1}
      borderStyle='single'
      borderColor={focused ? 'green' : '#666'}
    >
      {children}
    </Box>
  );
};
