//
// Copyright 2023 DXOS.org
//

import type { DecoratorFunction } from '@storybook/csf';
import type { ReactRenderer } from '@storybook/react';
import React from 'react';

export const FullscreenDecorator = (className?: string): DecoratorFunction<ReactRenderer> => {
  return (Story) => (
    <div className={['flex fixed inset-0 overflow-hidden', className].join(' ')}>
      <Story />
    </div>
  );
};
