//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useRef } from 'react';

import { ComputeValueType, TemplateOutput, VoidInput, getTemplateInputSchema } from '@dxos/conductor';
import { JsonSchema } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import {
  type ShapeComponentProps,
  type ShapeDef,
  TextBox,
  type TextBoxControl,
  type TextBoxProps,
} from '@dxos/react-ui-canvas-editor';

import { useComputeNodeState } from '../hooks';

import { Box, TypeSelect, createFunctionAnchors } from './common';
import { ComputeShape, type CreateShapeProps, createShape } from './defs';

//
// Data
//

export const TemplateShape = Schema.extend(
  ComputeShape,
  Schema.Struct({
    type: Schema.Literal('template'),
    valueType: Schema.optional(ComputeValueType),
  }),
);

export type TemplateShape = Schema.Schema.Type<typeof TemplateShape>;

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
      node.inputSchema = JsonSchema.toJsonSchema(schema);
    }
  };

  const handleTypeChange = (newType: string) => {
    invariant(Schema.is(ComputeValueType)(newType), 'Invalid type');

    node.valueType = newType;
    node.inputSchema = JsonSchema.toJsonSchema(getTemplateInputSchema(node));
  };

  return (
    <Box
      shape={shape}
      title={'Template'}
      status={<TypeSelect value={node.valueType ?? 'string'} onValueChange={handleTypeChange} />}
    >
      <TextBox
        {...props}
        ref={inputRef}
        value={node.value}
        language={node.valueType === 'object' ? 'json' : undefined}
        onBlur={handleEnter}
        onEnter={handleEnter}
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
