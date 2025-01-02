//
// Copyright 2024 DXOS.org
//

import React, { useState } from 'react';

import { S } from '@dxos/echo-schema';

import { ComputeShape } from './defs';
import { createAnchors, type ShapeComponentProps, type ShapeDef, TextBox, type TextBoxProps } from '../../components';
import { createAnchorId, DEFAULT_OUTPUT } from '../../shapes';
import { Text } from '../graph';

export const TextShape = S.extend(
  ComputeShape,
  S.Struct({
    type: S.Literal('text'),
  }),
);

export type TextShape = ComputeShape<S.Schema.Type<typeof TextShape>, Text>;

export type CreateTextProps = Omit<TextShape, 'type' | 'node' | 'size'>;

export const createText = ({ id, ...rest }: CreateTextProps): TextShape => ({
  id,
  type: 'text',
  node: new Text(),
  size: { width: 256, height: 128 },
  ...rest,
});

export const TextComponent = ({ shape }: ShapeComponentProps<TextShape>) => {
  const [reset, setReset] = useState({});
  const handleEnter: TextBoxProps['onEnter'] = (value) => {
    if (value.trim().length) {
      // TODO(burdon): Standardize.
      shape.node.setOutput({ [DEFAULT_OUTPUT]: value });
      setReset({});
    }
  };

  return (
    <div className='flex w-full h-full p-2'>
      <TextBox classNames='flex grow overflow-hidden' reset={reset} placeholder='Prompt' onEnter={handleEnter} />
    </div>
  );
};

export const textShape: ShapeDef<TextShape> = {
  type: 'text',
  icon: 'ph--textbox--regular',
  component: TextComponent,
  createShape: createText,
  getAnchors: (shape) => createAnchors(shape, { [createAnchorId('output')]: { x: 1, y: 0 } }),
};
