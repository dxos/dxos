//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type ShapeComponentProps } from '@dxos/react-ui-canvas-editor';

import { Box } from './common/index.ts';
import { type DatabaseShape } from './database-def.ts';

export const DatabaseComponent = ({ shape }: ShapeComponentProps<DatabaseShape>) => {
  return <Box shape={shape} />;
};
