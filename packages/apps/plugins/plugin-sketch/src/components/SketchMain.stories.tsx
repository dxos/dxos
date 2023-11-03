//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import type { DecoratorFunction } from '@storybook/csf';
import type { ReactRenderer } from '@storybook/react';
import React from 'react';

import { Sketch as SketchType } from '@braneframe/types';
import { mx } from '@dxos/react-ui-theme';

import { SketchMain } from './SketchMain';

// TODO(burdon): Factor out.
const FullscreenDecorator = (className?: string): DecoratorFunction<ReactRenderer, any> => {
  return (Story) => (
    <div className={mx('flex fixed inset-0 overflow-hidden', className)}>
      <Story />
    </div>
  );
};

export default {
  component: SketchMain,
  decorators: [FullscreenDecorator()],
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {
  args: {
    sketch: new SketchType(),
  },
};
