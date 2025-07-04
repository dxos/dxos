//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { Circle } from '@phosphor-icons/react';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { faker } from '@dxos/random';
import { Button } from '@dxos/react-ui';
import { withTheme } from '@dxos/storybook-utils';

import { WelcomeTour, type WelcomeTourProps } from './WelcomeTour';
import { useHelp } from '../../hooks';

const App = () => {
  const { running, start } = useHelp();
  const [items, setItems] = useState(() => Array.from({ length: 5 }).map(() => faker.lorem.sentence()));
  const handleAdd = () => {
    setItems((items) => [...items, faker.lorem.sentence()]);
  };

  return (
    <div className='flex flex-col h-full p-4 space-y-8'>
      <div className='flex items-center gap-2 py-2'>
        <Button data-joyride='basic/1' onClick={() => start()}>
          Start
        </Button>
        <div className='grow' />
        <div>{String(running)}</div>
      </div>
      <div>
        <ul className='p-2 border border-blue-500 rounded-md' data-joyride='basic/2'>
          {items.map((item, i) => (
            <li key={i} className='flex items-center gap-2'>
              <Circle />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className='flex items-center gap-2 py-2'>
        <Button data-joyride='basic/3' onClick={handleAdd}>
          Add
        </Button>
      </div>
      <div className='flex grow' />
      <div className='flex items-center py-2'>
        <div className='grow' />
        <Circle data-joyride='basic/4' />
        <Circle />
        <Circle />
      </div>
    </div>
  );
};

const DefaultStory = ({ steps = [] }: WelcomeTourProps) => (
  <>
    <WelcomeTour steps={steps} />
    <div className='fixed inset-0 overflow-hidden'>
      <App />
    </div>
  </>
);

// TODO(burdon): Tour should prompt user to create a Stack -- and respond to it being created.
//  Use beacon to simulate click.

export const Default: StoryObj<typeof WelcomeTour> = {
  args: {
    // https://docs.react-joyride.com/step#options
    steps: [
      {
        target: '[data-joyride="basic/1"]',
        title: 'plugins/Step 1',
        content: faker.lorem.paragraph(),
        disableBeacon: true,
        placement: 'right',
      },
      {
        target: '[data-joyride="basic/2"]',
        title: 'plugins/Step 2',
        content: faker.lorem.paragraph(),
      },
      {
        target: '[data-joyride="basic/3"]',
        title: 'plugins/Step 3',
        content: faker.lorem.paragraph(),
        placement: 'right',
      },
      {
        target: '[data-joyride="basic/4"]',
        title: 'plugins/Step 4',
        content: faker.lorem.paragraph(),
        placement: 'top-end',
      },
    ],
  },
};

/**
 * IMPORTANT: Run in separate tab.
 */
const meta: Meta<typeof WelcomeTour> = {
  title: 'plugins/plugin-help/WelcomeTour',
  component: WelcomeTour,
  render: DefaultStory,
  decorators: [withTheme],
};

export default meta;
