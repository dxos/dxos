//
// Copyright 2023 DXOS.org
//

// TODO(burdon): Factor out.
import type { DecoratorFunction } from '@storybook/csf';
import React from 'react';

import { mx } from '@dxos/react-ui-theme';

export const FullscreenDecorator = (className?: string): DecoratorFunction<any> => {
  return (Story) => (
    <div className={mx('flex fixed inset-0 overflow-hidden', className)}>
      <Story />
    </div>
  );
};
