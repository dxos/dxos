//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { AppendInput } from '@dxos/conductor';
import { type ShapeComponentProps } from '@dxos/react-ui-canvas-editor';

import { type AppendShape } from './append-def.ts';
import { FunctionBody } from './common/index.ts';

export const AppendComponent = ({ shape }: ShapeComponentProps<AppendShape>) => {
  return <FunctionBody shape={shape} inputSchema={AppendInput} />;
};
