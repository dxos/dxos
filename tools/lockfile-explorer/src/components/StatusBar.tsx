//
// Copyright 2025 DXOS.org
//

import { Box, Text } from 'ink';
import React, { type ReactNode } from 'react';

export type StatusBar = {
  actions: {
    binding: string;
    description: ReactNode;
  }[];
  statusText?: string;
};

export const StatusBar = ({ actions, statusText }: StatusBar) => {
  return (
    <Box flexDirection='row'>
      {actions.map(({ binding, description }) => (
        <Text>
          <Text bold>[{binding}]</Text> <Text color='gray'>{description}</Text>
        </Text>
      ))}
      {statusText != null && (
        <>
          <Text bold>{' | '}</Text>
          <Text color='gray'>{statusText}</Text>
        </>
      )}
    </Box>
  );
};
