//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { S } from '@dxos/echo-schema';

import { ComputeShape } from './defs';
import { createAnchors, type ShapeComponentProps, type ShapeDef, TextBox } from '../../components';
import { createAnchorId } from '../../shapes';
import { Textbox } from '../graph';

export const TextboxShape = S.extend(
  ComputeShape,
  S.Struct({
    type: S.Literal('textbox'),
  }),
);

export type TextboxShape = ComputeShape<S.Schema.Type<typeof TextboxShape>, Textbox>;

export type CreateTextboxProps = Omit<TextboxShape, 'type' | 'node' | 'size'>;

export const createTextbox = ({ id, ...rest }: CreateTextboxProps): TextboxShape => ({
  id,
  type: 'textbox',
  node: new Textbox(),
  size: { width: 256, height: 128 },
  ...rest,
});

// TODO(burdon): Wobbles.
export const TextboxComponent = ({ shape }: ShapeComponentProps<TextboxShape>) => {
  return (
    <div className='flex w-full h-full p-2'>
      <TextBox classNames='flex grow overflow-hidden' placeholder='Prompt' />
    </div>
  );
};

export const textboxShape: ShapeDef<TextboxShape> = {
  type: 'textbox',
  icon: 'ph--textbox--regular',
  component: TextboxComponent,
  createShape: createTextbox,
  getAnchors: (shape) => createAnchors(shape, { [createAnchorId('output')]: { x: 1, y: 0 } }),
};
