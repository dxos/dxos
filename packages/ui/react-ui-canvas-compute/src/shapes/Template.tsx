//
// Copyright 2024 DXOS.org
//

import React, { useRef } from 'react';

import {
  ComputeValueType,
  getObjectTemplateInputSchema,
  getTemplateInputSchema,
  getTextTemplateInputSchema,
  TemplateOutput,
  VoidInput,
} from '@dxos/conductor';
import { S, toJsonSchema } from '@dxos/echo-schema';
import {
  type ShapeComponentProps,
  type ShapeDef,
  TextBox,
  type TextBoxControl,
  type TextBoxProps,
} from '@dxos/react-ui-canvas-editor';

import { useComputeNodeState } from '../hooks';
import { Box, createFunctionAnchors, TypeSelect } from './common';
import { ComputeShape, createShape, type CreateShapeProps } from './defs';
import { invariant } from '@dxos/invariant';

//
// Data
//

export const TemplateShape = S.extend(
  ComputeShape,
  S.Struct({
    type: S.Literal('template'),
    valueType: S.optional(ComputeValueType),
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
      const schema = getTemplateInputSchema(node);

      node.value = value;
      node.inputSchema = toJsonSchema(schema);
    }
  };

  const handleTypeChange = (newType: string) => {
    invariant(S.is(ComputeValueType)(newType), 'Invalid type');

    node.valueType = newType;
    node.inputSchema = toJsonSchema(getTemplateInputSchema(node));
  };

  return (
    <Box
      shape={shape}
      title={'Template'}
      status={<TypeSelect value={node.valueType ?? 'string'} onValueChange={handleTypeChange} />}
    >
      <TextBox
        ref={inputRef}
        value={shape.text}
        onBlur={handleEnter}
        onEnter={handleEnter}
        {...props}
        json={node.valueType === 'object'}
      />
    </Box>
  );
};

//
// Defs
//

export type CreateTemplateProps = CreateShapeProps<TemplateShape> & { text?: string };

export const createTemplate = (props: CreateTemplateProps) =>
  createShape<TemplateShape>({ type: 'template', size: { width: 256, height: 384 }, ...props });

export const templateShape: ShapeDef<TemplateShape> = {
  type: 'template',
  name: 'Template',
  icon: 'ph--article--regular',
  component: (props) => <TextInputComponent {...props} placeholder={'Prompt'} />,
  createShape: createTemplate,
  getAnchors: (shape) => createFunctionAnchors(shape, VoidInput, TemplateOutput),
  resizable: true,
};
