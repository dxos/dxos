//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';
import type { DecoratorFunction } from '@storybook/csf';
import type { ReactRenderer } from '@storybook/react';
import React from 'react';

import { mx } from '@dxos/aurora-theme';

import { Presenter } from './Presenter';
import { createSlide } from './testing';

// TODO(burdon): Factor out.
const FullscreenDecorator = (className?: string): DecoratorFunction<ReactRenderer, any> => {
  return (Story) => (
    <div className={mx('flex fixed inset-0 overflow-hidden', className)}>
      <Story />
    </div>
  );
};

export default {
  component: Presenter,
  decorators: [FullscreenDecorator()],
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {
  args: {
    content: createSlide(),
  },
};
