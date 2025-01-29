//
// Copyright 2024 DXOS.org
//

import React, { useRef } from 'react';

import { TemplateOutput, VoidInput } from '@dxos/conductor';
import { S, toJsonSchema } from '@dxos/echo-schema';
import {
  type ShapeComponentProps,
  type ShapeDef,
  TextBox,
  type TextBoxControl,
  type TextBoxProps,
} from '@dxos/react-ui-canvas-editor';

import { Box, createFunctionAnchors } from './common';
import { ComputeShape, createShape, type CreateShapeProps } from './defs';
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
      const properties = findHandlebarVariables(value);
      const schema = S.Struct(
        properties.reduce((acc, property) => {
          acc[property] = S.Any;
          return acc;
        }, {} as any),
      );

      node.value = value;
      node.inputSchema = toJsonSchema(schema);
    }
  };

  return (
    <Box shape={shape} title={'Template'}>
      <TextBox ref={inputRef} value={shape.text} onBlur={handleEnter} onEnter={handleEnter} {...props} />
    </Box>
  );
};

const findHandlebarVariables = (text: string): string[] => {
  const regex = /\{\{([^}]+)\}\}/g; // Matches anything between {{ }}
  const matches = [...text.matchAll(regex)];
  return matches.map((match) => match[1].trim());
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
  getAnchors: (shape) => createFunctionAnchors(shape, VoidInput, TemplateOutput),
  resizable: true,
};
