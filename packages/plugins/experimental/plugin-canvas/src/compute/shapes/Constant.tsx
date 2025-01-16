//
// Copyright 2024 DXOS.org
//

import React, { useRef, useState } from 'react';

import { S } from '@dxos/echo-schema';

import { Box } from './components';
import { ComputeShape, createAnchorId, type CreateShapeProps } from './defs';
import {
  type ShapeComponentProps,
  type ShapeDef,
  TextBox,
  type TextBoxControl,
  type TextBoxProps,
} from '../../components';
import { createAnchorMap } from '../../components';
import { DEFAULT_OUTPUT } from '../graph';
import { useComputeNodeState } from '../hooks';

//
// Data
//

export const ConstantShape = S.extend(
  ComputeShape,
  S.Struct({
    type: S.Literal('constant'),
    constant: S.optional(S.Any),
  }),
);

export type ConstantShape = S.Schema.Type<typeof ConstantShape>;

//
// Component
//

export type ConstantComponentProps = ShapeComponentProps<ConstantShape> &
  TextBoxProps & { title?: string; chat?: boolean };

export const ConstantComponent = ({ shape, title, chat, ...props }: ConstantComponentProps) => {
  const { runtime, node } = useComputeNodeState(shape);

  return (
    <Box name={title ?? 'Text'}>
      <TextBox
        classNames='flex grow p-2 overflow-hidden'
        {...props}
        value={node.data.constant}
        onEnter={(value) => {
          node.data.constant = value;
        }}
      />
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
  icon: 'ph--article--regular',
  component: (props) => <ConstantComponent {...props} placeholder={'Text'} />,
  createShape: createConstant,
  getAnchors: (shape) => createAnchorMap(shape, { [createAnchorId('output')]: { x: 1, y: 0 } }),
};
