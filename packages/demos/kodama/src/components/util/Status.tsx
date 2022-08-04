//
// Copyright 2022 DXOS.org
//

import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import React, { FC } from 'react';

/**
 * Status
 */
export const Status: FC<{
  error?: string | Error
  processing?: string
  marginTop?: number
}> = ({
  error,
  processing,
  marginTop = 0
}) => {
  if (!error && !processing) {
    return null;
  }

  return (
    <Box marginTop={marginTop}>
      {error && (
        <Text color='red'>{String(error)}</Text>
      )}

      {processing && !error && (
        <Text>
          <Text color='green'>
            <Spinner type='dots' />
          </Text>
          {` ${processing}`}
        </Text>
      )}
    </Box>
  );
};
