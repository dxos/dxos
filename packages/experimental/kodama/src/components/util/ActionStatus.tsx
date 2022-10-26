//
// Copyright 2022 DXOS.org
//

import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import React, { FC } from 'react';

export type StatusState = {
  processing?: string;
  success?: string;
  error?: string | Error;
};

/**
 * Status
 */
export const ActionStatus: FC<{
  status?: StatusState;
  marginTop?: number;
}> = ({ status = {}, marginTop = 0 }) => {
  const { processing, success, error } = status;
  if (!error && !success && !processing) {
    return null;
  }

  return (
    <Box marginTop={marginTop}>
      {success && <Text color='green'>{success}</Text>}

      {error && <Text color='red'>{String(error)}</Text>}

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
