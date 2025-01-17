//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { S } from '@dxos/echo-schema';

import { Box } from './common';
import { ComputeShape, createAnchorId, type CreateShapeProps } from './defs';
import { type ShapeComponentProps, type ShapeDef, type TextBoxProps } from '../../components';
import { createAnchorMap } from '../../components';
import { useComputeNodeState } from '../hooks';

//
// Data
//

export const ConstantShape = S.extend(
  ComputeShape,
  S.Struct({
    type: S.Literal('constant'),
    value: S.optional(S.Any),
  }),
);

export type ConstantShape = S.Schema.Type<typeof ConstantShape>;

//
// Component
//

export type ConstantComponentProps = ShapeComponentProps<ConstantShape> &
  TextBoxProps & { title?: string; chat?: boolean };

export const ConstantComponent = ({ shape, title, chat, ...props }: ConstantComponentProps) => {
  const { node } = useComputeNodeState(shape);

  return (
    <Box shape={shape} name={title}>
      <div className='p-1 truncate'>{node.data.constant}</div>
      {/* <TextBox */}
      {/*  {...props} */}
      {/*  value={node.data.constant} */}
      {/*  onEnter={(value) => { */}
      {/*    node.data.constant = value; */}
      {/*  }} */}
      {/* /> */}
    </Box>
  );
};

//
// Defs
//

export type CreateConstantProps = CreateShapeProps<ConstantShape>;

export const createConstant = ({
  id,
  text,
  size = { width: 256, height: 128 },
  ...rest
}: CreateConstantProps): ConstantShape => ({
  id,
  type: 'constant',
  size,
  ...rest,
});

export const constantShape: ShapeDef<ConstantShape> = {
  type: 'constant',
  name: 'Value',
  icon: 'ph--dots-three-circle--regular',
  component: (props) => <ConstantComponent {...props} placeholder={'Text'} />,
  createShape: createConstant,
  getAnchors: (shape) => createAnchorMap(shape, { [createAnchorId('output')]: { x: 1, y: 0 } }),
};
