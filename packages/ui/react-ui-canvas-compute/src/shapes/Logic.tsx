//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { IfElseInput, IfElseOutput, IfInput, IfOutput } from '@dxos/conductor';

import { type ComputeNodeViewProps, FunctionBody } from './common/index.ts';
import { type IfElseShape, type IfShape } from './logic-def.ts';

//
// Components
//

export type IfComponentProps = ComputeNodeViewProps<IfShape>;

export const IfComponent = ({ node: shape }: IfComponentProps) => {
  return <FunctionBody shape={shape} inputSchema={IfInput} outputSchema={IfOutput} />;
};

export type IfElseComponentProps = ComputeNodeViewProps<IfElseShape>;

export const IfElseComponent = ({ node: shape }: IfElseComponentProps) => {
  return <FunctionBody shape={shape} inputSchema={IfElseInput} outputSchema={IfElseOutput} />;
};
