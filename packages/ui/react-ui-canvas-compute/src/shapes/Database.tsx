//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Box, type ComputeNodeViewProps } from './common/index.ts';
import { type DatabaseShape } from './database-def.ts';

export const DatabaseComponent = ({ node: shape }: ComputeNodeViewProps<DatabaseShape>) => {
  return <Box shape={shape} />;
};
