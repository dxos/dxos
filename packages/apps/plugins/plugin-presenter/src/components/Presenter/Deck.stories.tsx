//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';
import type { DecoratorFunction } from '@storybook/csf';
import type { ReactRenderer } from '@storybook/react';
import React, { type FC } from 'react';

import { mx } from '@dxos/aurora-theme';

import { Deck, type DeckProps } from './Deck';
import { createSlides } from './testing';

// TODO(burdon): Factor out.
const FullscreenDecorator = (className?: string): DecoratorFunction<ReactRenderer, any> => {
  return (Story) => (
    <div className={mx('flex fixed inset-0 overflow-hidden', className)}>
      <Story />
    </div>
  );
};

const Story: FC<Omit<DeckProps, 'onChange'>> = (args) => <Deck {...args} />;

export default {
  component: Story,
  decorators: [FullscreenDecorator()],
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {
  args: {
    slides: createSlides(8),
  },
};
