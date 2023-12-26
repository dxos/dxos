//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { faker } from '@faker-js/faker';
import React, { type FC } from 'react';
import Joyride, { type Step } from 'react-joyride';

import { Button } from '@dxos/react-ui';
import { tailwindConfig, type TailwindConfig } from '@dxos/react-ui-theme';
import { type Meta, withTheme } from '@dxos/storybook-utils';

import { floaterProps, Tooltip } from './Tooltip';
import { useTour } from '../hooks';

export const tokens: TailwindConfig['theme'] = tailwindConfig({}).theme;

const Story: FC<{ steps?: Step[] }> = ({ steps = [] }) => {
  const { running, step, callback, start } = useTour(true);

  return (
    <div className='app'>
      {/* https://docs.react-joyride.com/custom-components */}
      <Joyride
        continuous={true}
        disableOverlay={true}
        disableOverlayClose={true}
        run={running}
        steps={steps}
        stepIndex={step}
        callback={callback}
        floaterProps={floaterProps}
        tooltipComponent={Tooltip}
      />

      <div className='flex flex-col space-y-8'>
        <div className='flex items-center gap-2 py-2'>
          <Button data-joyride='basic/1' onClick={() => start()}>
            Start
          </Button>
          <div className='grow' />
          <div>{String(running)}</div>
        </div>
        <div>
          <ul className='p-2 border border-blue-500 rounded-md' data-joyride='basic/2'>
            <li>Item 1</li>
            <li>Item 2</li>
            <li>Item 3</li>
            <li>Item 4</li>
            <li>Item 5</li>
          </ul>
        </div>
        <div className='flex items-center gap-2 py-2'>
          <Button data-joyride='basic/3'>Add</Button>
        </div>
      </div>
    </div>
  );
};

/**
 * IMPORTANT: Storybook must be run in separate tab.
 */
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
    ],
  },
};
