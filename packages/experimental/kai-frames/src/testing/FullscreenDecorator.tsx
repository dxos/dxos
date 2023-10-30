//
// Copyright 2023 DXOS.org
//

import { DecoratorFunction } from '@storybook/csf';
import { ReactRenderer } from '@storybook/react';
import React from 'react';

import { mx } from '@dxos/react-ui-theme';

export const FullscreenDecorator = (className?: string): DecoratorFunction<any> => {
  return (Story) => (
    <div className={mx('flex absolute left-0 right-0 top-0 bottom-0 overflow-hidden', className)}>
      <Story />
    </div>
  );
};
