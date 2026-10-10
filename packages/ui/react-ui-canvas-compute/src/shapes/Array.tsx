//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { ReducerInput, ReducerOutput } from '@dxos/conductor';

import { type ReducerShape } from './array-def.ts';
import { type ComputeNodeViewProps, FunctionBody } from './common/index.ts';

//
// Components
//

export type ReducerComponentProps = ComputeNodeViewProps<ReducerShape>;

export const ReducerComponent = ({ node: shape }: ReducerComponentProps) => {
  return <FunctionBody shape={shape} inputSchema={ReducerInput} outputSchema={ReducerOutput} />;
};
