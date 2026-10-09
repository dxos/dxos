//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { AppendInput } from '@dxos/conductor';

import { type AppendShape } from './append-def.ts';
import { type ComputeNodeViewProps, FunctionBody } from './common/index.ts';

export const AppendComponent = ({ node: shape }: ComputeNodeViewProps<AppendShape>) => {
  return <FunctionBody shape={shape} inputSchema={AppendInput} />;
};
