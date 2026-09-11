//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { ReducerInput, ReducerOutput } from '@dxos/conductor';
import { type ShapeComponentProps } from '@dxos/react-ui-canvas-editor';

import { type ReducerShape } from './array-def.ts';
import { FunctionBody } from './common/index.ts';

//
// Components
//

export type ReducerComponentProps = ShapeComponentProps<ReducerShape>;

export const ReducerComponent = ({ shape }: ReducerComponentProps) => {
  return <FunctionBody shape={shape} inputSchema={ReducerInput} outputSchema={ReducerOutput} />;
};
