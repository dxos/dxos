//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import type { DecoratorFunction } from '@storybook/csf';
import type { ReactRenderer } from '@storybook/react';
import React, { useState } from 'react';

import { Sketch as SketchType } from '@braneframe/types';
import { Button, Toolbar } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { SketchComponent } from './Sketch';

// TODO(burdon): Factor out.
const FullscreenDecorator = (className?: string): DecoratorFunction<ReactRenderer, any> => {
  return (Story) => (
    <div className={mx('flex fixed inset-0 overflow-hidden', className)}>
      <Story />
    </div>
  );
};

const Story = () => {
  const [sketch, setSketch] = useState<SketchType>(new SketchType());

  return (
    <div className='flex flex-col grow overflow-hidden divide-y'>
      <Toolbar.Root>
        <Button variant={'ghost'} onClick={() => setSketch(new SketchType())}>
          Change
        </Button>
      </Toolbar.Root>
      <div className='flex grow overflow-hidden'>
        <SketchComponent sketch={sketch} />
      </div>
    </div>
  );
};

export default {
  component: SketchComponent,
  render: Story,
  decorators: [FullscreenDecorator()],
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {};
