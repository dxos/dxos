//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { IconButton, type IconButtonProps } from '@dxos/react-ui';

import { type BaseShapeProps } from './Shape';
import { type FunctionShape } from '../../../types';

export const Function = ({ shape }: BaseShapeProps<FunctionShape>) => {
  const handleAdd: IconButtonProps['onClick'] = (ev) => {
    ev.stopPropagation(); // TODO(burdon): Prevent select.
    shape.properties.push({ name: `prop-${shape.properties.length + 1}`, type: 'string' });
    shape.size.height += 24; // TODO(burdon): Trigger layout.
  };

  // TODO(burdon): Not reactive?
  console.log(shape.properties);

  // TODO(burdon): Position of anchors.

  return (
    <div className='flex flex-col h-full w-full'>
      <div className='flex w-full justify-between items-center'>
        <IconButton icon='ph--plus--regular' label='play' iconOnly onClick={handleAdd} />
        <IconButton icon='ph--play--regular' label='play' iconOnly />
      </div>
      {/* TODO(burdon): List. */}
      <div>
        {shape.properties.map(({ name }) => (
          <div key={name}>{name}</div>
        ))}
      </div>
    </div>
  );
};
