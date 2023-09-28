//
// Copyright 2023 DXOS.org
//

import { DecoratorFunction } from '@storybook/csf';
import { ReactRenderer } from '@storybook/react';
import React from 'react';

import { mx } from '@dxos/aurora-theme';

const FullscreenDecorator = (className?: string): DecoratorFunction<ReactRenderer> => {
  return (Story) => (
    <div className={mx('flex fixed inset-0 overflow-hidden', className)}>
      <Story />
    </div>
  );
};

const GridContainer = () => {
  return <div className='ring'>RING</div>;
};

export default {
  decorators: [FullscreenDecorator()],
  component: GridContainer,
};
