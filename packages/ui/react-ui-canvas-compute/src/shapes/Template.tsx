//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useRef } from 'react';

import { ComputeValueType, getTemplateInputSchema } from '@dxos/conductor';
import { toJsonSchema } from '@dxos/echo/JsonSchema';
import { invariant } from '@dxos/invariant';
import {
  type ShapeComponentProps,
  TextBox,
  type TextBoxControl,
  type TextBoxProps,
} from '@dxos/react-ui-canvas-editor';

import { useComputeNodeState } from '../hooks/index.ts';
import { Box, TypeSelect } from './common/index.ts';
import { type TemplateShape } from './template-def.ts';

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
    invariant(Schema.is(ComputeValueType)(newType), 'Invalid type');

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

export const TemplateComponent = (props: ShapeComponentProps<TemplateShape>) => (
  <TextInputComponent {...props} placeholder={'Prompt'} />
);
