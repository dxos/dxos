//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { faker } from '@faker-js/faker';
import React, { type FC } from 'react';
import Joyride, { type Step } from 'react-joyride';

import { Button } from '@dxos/react-ui';
import { type Meta, withTheme } from '@dxos/storybook-utils';

import { Tooltip } from './Tooltip';
import { useTour } from '../hooks';

const Story: FC<{ steps?: Step[] }> = ({ steps = [] }) => {
  const { running, step, callback, start } = useTour();

  // IMPORTANT: Storybook must be run in separate tab.
  return (
    <div className='app'>
      {/* https://docs.react-joyride.com/custom-components */}
      <Joyride
        continuous={true}
        run={running}
        steps={steps}
        stepIndex={step}
        callback={callback}
        tooltipComponent={Tooltip}
      />

      <div className='flex flex-col space-y-8'>
        <div className='flex items-center gap-2 py-2' data-joyride='basic/1'>
          <Button data-joyride='basic/2' onClick={() => start()}>
            Start
          </Button>
          <div>{String(running)}</div>
        </div>
        <div>
          <ul className='p-2'>
            <li>Step 1</li>
            <li>Step 2</li>
            <li>Step 3</li>
          </ul>
          <div className='flex items-center gap-2 py-2'>
            <Button data-joyride='basic/3'>Add</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const meta: Meta = {
  title: 'plugin-tour/Joyride',
  render: (args) => <Story {...args} />,
  decorators: [withTheme],
};

export default meta;

export const Default = {
  args: {
    // https://docs.react-joyride.com/step#options
    steps: [
      {
        target: '[data-joyride="basic/1"]',
        title: 'Step 1',
        content: faker.lorem.paragraph(),
        disableBeacon: true,
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
    ],
  },
};
