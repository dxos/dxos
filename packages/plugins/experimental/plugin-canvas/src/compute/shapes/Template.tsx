//
// Copyright 2024 DXOS.org
//

import React, { useRef } from 'react';

import { TemplateOutput, VoidInput } from '@dxos/conductor';
import { S, toJsonSchema } from '@dxos/echo-schema';

import { Box, createFunctionAnchors } from './common';
import { ComputeShape, createShape, type CreateShapeProps } from './defs';
import {
  type ShapeComponentProps,
  type ShapeDef,
  TextBox,
  type TextBoxControl,
  type TextBoxProps,
} from '../../components';
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
  const { node } = useComputeNodeState(shape);
  const inputRef = useRef<TextBoxControl>(null);

  const handleEnter: TextBoxProps['onEnter'] = (text) => {
    const value = text.trim();
    if (value.length) {
      node.value = value;
      node.inputSchema = toJsonSchema(S.Struct({ foo: S.String }));
      inputRef.current?.focus();
    }
  };

  return (
    <Box shape={shape} title={'Template'}>
      <TextBox ref={inputRef} value={shape.text} onEnter={handleEnter} {...props} />
    </Box>
  );
};

//
// Defs
//

export type CreateTemplateProps = CreateShapeProps<TemplateShape> & { text?: string };

export const createTemplate = (props: CreateTemplateProps) =>
  createShape<TemplateShape>({ type: 'template', size: { width: 256, height: 128 }, ...props });

export const templateShape: ShapeDef<TemplateShape> = {
  type: 'template',
  name: 'Template',
  icon: 'ph--article--regular',
  component: (props) => <TextInputComponent {...props} placeholder={'Prompt'} />,
  createShape: createTemplate,
  getAnchors: (shape) => {
    // TODO(burdon): Get dynamic schema.
    return createFunctionAnchors(shape, VoidInput, TemplateOutput);
  },
  resizable: true,
};
