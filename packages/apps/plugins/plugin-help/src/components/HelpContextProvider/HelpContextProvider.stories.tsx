//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { Circle } from '@phosphor-icons/react';
import React, { type FC, useState } from 'react';
import { type Step } from 'react-joyride';

import { faker } from '@dxos/random';
import { Button } from '@dxos/react-ui';
import { type Meta, withTheme } from '@dxos/storybook-utils';

import { HelpContextProvider } from './HelpContextProvider';
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

const Story: FC<{ steps?: Step[] }> = ({ steps = [] }) => (
  <HelpContextProvider steps={steps}>
    <div className='fixed inset-0 overflow-hidden'>
      <App />
    </div>
  </HelpContextProvider>
);

/**
 * IMPORTANT: Storybook must be run in separate tab.
 */
const meta: Meta = {
  title: 'plugin-help/Joyride',
  render: (args: any) => <Story {...args} />,
  decorators: [withTheme],
};

export default meta;

// TODO(burdon): Tour should prompt user to create a Stack -- and respond to it being created.
//  Use beacon to simulate click.

export const Default = {
  args: {
    // https://docs.react-joyride.com/step#options
    steps: [
      {
        target: '[data-joyride="basic/1"]',
        title: 'Step 1',
        content: faker.lorem.paragraph(),
        disableBeacon: true,
        placement: 'right',
      },
      {
        target: '[data-joyride="basic/2"]',
        title: 'Step 2',
        content: faker.lorem.paragraph(),
      },
      {
        target: '[data-joyride="basic/3"]',
        title: 'Step 3',
        content: faker.lorem.paragraph(),
        placement: 'right',
      },
      {
        target: '[data-joyride="basic/4"]',
        title: 'Step 4',
        content: faker.lorem.paragraph(),
        placement: 'top-end',
      },
    ],
  },
};
