//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useCallback, useRef, useState } from 'react';

import { ComputeValueType } from '@dxos/conductor';
import { Input } from '@dxos/react-ui';
import {
  type ShapeComponentProps,
  type ShapeDef,
  TextBox,
  type TextBoxControl,
  type TextBoxProps,
} from '@dxos/react-ui-canvas-editor';
import { createAnchorMap } from '@dxos/react-ui-canvas-editor';
import { safeParseJson } from '@dxos/util';

import { useComputeNodeState } from '../hooks';

import { Box, TypeSelect } from './common';
import { ComputeShape, type CreateShapeProps, createAnchorId, createShape } from './defs';

//
// Data
//

export const ConstantShape = Schema.extend(
  ComputeShape,
  Schema.Struct({
    type: Schema.Literal('constant'),
    value: Schema.optional(Schema.Any),
  }),
);

export type ConstantShape = Schema.Schema.Type<typeof ConstantShape>;

//
// Component
//

export type ConstantComponentProps = ShapeComponentProps<ConstantShape> &
  TextBoxProps & { title?: string; chat?: boolean };

const inferType = (value: any): string | undefined => {
  if (typeof value === 'string') {
    return 'string';
  } else if (typeof value === 'number') {
    return 'number';
  } else if (typeof value === 'boolean') {
    return 'boolean';
  } else if (typeof value === 'object') {
    return 'object';
  }
};

export const ConstantComponent = ({ shape, title, chat, ...props }: ConstantComponentProps) => {
  const { node } = useComputeNodeState(shape);
  const [type, setType] = useState(inferType(node.value) ?? ComputeValueType.literals[0]);
  const inputRef = useRef<TextBoxControl>(null);

  const handleEnter = useCallback<NonNullable<TextBoxProps['onEnter']>>(
    (text) => {
      const value = text.trim();
      if (value.length) {
        // TODO(burdon): Set text filter.
        if (type === 'number') {
          const floatValue = parseFloat(value);
          if (!isNaN(floatValue)) {
            node.value = floatValue;
          }
        } else if (type === 'object') {
          node.value = safeParseJson(value, {});
        } else {
          node.value = value;
        }

        inputRef.current?.focus();
      }
    },
    [type],
  );

  return (
    <Box shape={shape} title={title} status={<TypeSelect value={type} onValueChange={setType} />}>
      {(type === 'string' || type === 'number') && (
        <TextBox {...props} ref={inputRef} value={node.value} onEnter={handleEnter} />
      )}
      {type === 'object' && (
        <TextBox {...props} ref={inputRef} value={JSON.stringify(node.value, null, 2)} language={'json'} />
      )}
      {type === 'boolean' && (
        <div className='flex grow justify-center items-center'>
          <Input.Root>
            <Input.Switch
              checked={node.value}
              onCheckedChange={(value) => {
                node.value = value;
              }}
            />
          </Input.Root>
        </div>
      )}
    </Box>
  );
};

//
// Defs
//

export type CreateConstantProps = CreateShapeProps<ConstantShape>;

export const createConstant = (props: CreateConstantProps) =>
  createShape<ConstantShape>({ type: 'constant', size: { width: 192, height: 128 }, ...props });

export const constantShape: ShapeDef<ConstantShape> = {
  type: 'constant',
  name: 'Value',
  icon: 'ph--dots-three-circle--regular',
  component: (props) => <ConstantComponent {...props} placeholder={'Constant'} />,
  createShape: createConstant,
  getAnchors: (shape) => createAnchorMap(shape, { [createAnchorId('output')]: { x: 1, y: 0 } }),
  resizable: true,
};
