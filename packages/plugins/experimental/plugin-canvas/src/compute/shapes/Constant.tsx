//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useRef, useState } from 'react';

import { S } from '@dxos/echo-schema';
import { Input, Select, type SelectRootProps } from '@dxos/react-ui';
import { safeParseJson } from '@dxos/util';

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
  const [type, setType] = useState(inferType(node.value) ?? types[0]);
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
    <Box shape={shape} name={title} status={<TypeSelect value={type} onValueChange={setType} />}>
      {(type === 'string' || type === 'number') && (
        <TextBox {...props} ref={inputRef} value={node.value} onEnter={handleEnter} />
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

const types = ['string', 'number', 'boolean', 'object'];

// TODO(burdon): Factor out.
const TypeSelect = ({ value, onValueChange }: Pick<SelectRootProps, 'value' | 'onValueChange'>) => {
  return (
    <Select.Root value={value} onValueChange={onValueChange}>
      <Select.TriggerButton variant='ghost' classNames='w-full !px-0' />
      <Select.Portal>
        <Select.Content>
          <Select.ScrollUpButton />
          <Select.Viewport>
            {types.map((type) => (
              <Select.Option key={type} value={type}>
                {type}
              </Select.Option>
            ))}
          </Select.Viewport>
          <Select.ScrollDownButton />
          <Select.Arrow />
        </Select.Content>
      </Select.Portal>
    </Select.Root>
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
