//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { IfElseInput, IfElseOutput, IfInput, IfOutput } from '@dxos/conductor';
import { type ShapeComponentProps } from '@dxos/react-ui-canvas-editor';

import { FunctionBody } from './common/index.ts';
import { type IfElseShape, type IfShape } from './logic-def.ts';

//
// Components
//

export type IfComponentProps = ShapeComponentProps<IfShape>;

export const IfComponent = ({ shape, ...props }: IfComponentProps) => {
  return <FunctionBody shape={shape} inputSchema={IfInput} outputSchema={IfOutput} />;
};

export type IfElseComponentProps = ShapeComponentProps<IfElseShape>;

export const IfElseComponent = ({ shape, ...props }: IfElseComponentProps) => {
  return <FunctionBody shape={shape} inputSchema={IfElseInput} outputSchema={IfElseOutput} />;
};
