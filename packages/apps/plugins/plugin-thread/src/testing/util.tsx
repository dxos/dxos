//
// Copyright 2023 DXOS.org
//

import type { DecoratorFunction } from '@storybook/csf';
import type { ReactRenderer } from '@storybook/react';
import React from 'react';

import { mx } from '@dxos/react-ui-theme';

// TODO(burdon): Factor out.
export const FullscreenDecorator = (className?: string): DecoratorFunction<any> => {
  return (Story) => (
    <div className={mx('flex fixed inset-0 overflow-hidden', className)}>
      <Story />
    </div>
  );
};
