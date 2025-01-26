//
// Copyright 2024 DXOS.org
//

import React, { useRef } from 'react';

import { DEFAULT_OUTPUT } from '@dxos/conductor';
import { S } from '@dxos/echo-schema';

import { Box } from './common';
import { ComputeShape, createAnchorId, createShape, type CreateShapeProps } from './defs';
import {
  type ShapeComponentProps,
  type ShapeDef,
  TextBox,
  type TextBoxControl,
  type TextBoxProps,
} from '../../components';
import { createAnchorMap } from '../../components';
import { useComputeNodeState } from '../hooks';

//
// Data
//

export const TemplateShape = S.extend(
  ComputeShape,
  S.Struct({
    type: S.Literal('template'),
  }),
);

export type TemplateShape = S.Schema.Type<typeof TemplateShape>;

//
// Component
//

type TextInputComponentProps = ShapeComponentProps<TemplateShape> & TextBoxProps & { title?: string };

const TextInputComponent = ({ shape, title, ...props }: TextInputComponentProps) => {
  const { node, runtime } = useComputeNodeState(shape);
  const inputRef = useRef<TextBoxControl>(null);

  console.log('node', node.value, shape.text, shape);

  const handleEnter: TextBoxProps['onEnter'] = (text) => {
    const value = text.trim();
    if (value.length) {
      runtime.setOutput(DEFAULT_OUTPUT, value);
      inputRef.current?.focus();
    }
  };

  return (
    <Box shape={shape} title={'Template'}>
      <TextBox ref={inputRef} onEnter={handleEnter} {...props} />
    </Box>
  );
};

//
// Defs
//

export type CreateTemplateProps = CreateShapeProps<TemplateShape> & { text?: string };

export const createTemplate = (props: CreateTemplateProps) =>
  createShape<TemplateShape>({ type: 'template', size: { width: 256, height: 128 }, ...props });

// TODO(burdon): Rename tempalte. Handlebars dynamic schema.
export const templateShape: ShapeDef<TemplateShape> = {
  type: 'template',
  name: 'Template',
  icon: 'ph--article--regular',
  component: (props) => <TextInputComponent {...props} placeholder={'Prompt'} />,
  createShape: createTemplate,
  getAnchors: (shape) => createAnchorMap(shape, { [createAnchorId('output')]: { x: 1, y: 0 } }),
  resizable: true,
};
