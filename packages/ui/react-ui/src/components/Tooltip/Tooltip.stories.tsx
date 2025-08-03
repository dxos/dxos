//
// Copyright 2022 DXOS.org
//

import '@dxos-theme';
import React from 'react';

import { faker } from '@dxos/random';

import { withTheme } from '../../testing';
import { Button } from '../Buttons';

import { Tooltip } from './Tooltip';

type StoryProps = {
  tooltips: { label: string; content: string }[];
  defaultOpen?: boolean;
};

const DefaultStory = ({ tooltips, defaultOpen }: StoryProps) => (
  <Tooltip.Provider defaultOpen={defaultOpen}>
    <div role='none' className='is-32'>
      {tooltips.map(({ label, content }, i) => (
        <Tooltip.Trigger asChild key={i} content={content} side='right'>
          <Button classNames='block is-full'>{label}</Button>
        </Tooltip.Trigger>
      ))}
    </div>
  </Tooltip.Provider>
);

export default {
  title: 'ui/react-ui-core/Tooltip',
  component: Tooltip,
  render: DefaultStory,
  decorators: [withTheme],
  parameters: { chromatic: { disableSnapshot: false } },
};

export const Default = {
  args: {
    tooltips: [
      {
        label: 'Tooltip trigger',
        content: 'This is the tooltip content',
      },
    ],
  },
  parameters: {
    chromatic: { delay: 500 },
  },
};

export const DefaultOpen = {
  args: {
    defaultOption: true,
    tooltips: [
      {
        label: 'Tooltip trigger',
        content: 'This is the tooltip content',
      },
    ],
  },
  parameters: {
    chromatic: { delay: 500 },
  },
};

export const StressTest = {
  args: {
    defaultOption: true,
    tooltips: faker.helpers.multiple(
      () => ({
        label: faker.lorem.words(2),
        content: faker.lorem.words(5),
      }),
      { count: 32 },
    ),
  },
  parameters: {
    chromatic: { disableSnapshot: true },
  },
};
