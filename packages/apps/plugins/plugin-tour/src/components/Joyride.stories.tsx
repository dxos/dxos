//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { type FC, useState } from 'react';
import Joyride, { ACTIONS, EVENTS, type Step, type TooltipProps } from 'react-joyride';

import { Button } from '@dxos/react-ui';
import { type Meta, withTheme } from '@dxos/storybook-utils';

// TODO(burdon): Custom tooltip.
const Tooltip = ({ step: { title } }: TooltipProps) => <div>{title}</div>;

const Story: FC<{ steps?: Step[] }> = ({ steps = [] }) => {
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(0);

  // https://docs.react-joyride.com/callback
  const handleTour: Joyride['callback'] = ({ action, type, index, size, ...rest }) => {
    // console.log('handleTour', { type, action, index, size, rest });

    switch (type) {
      case EVENTS.STEP_AFTER:
        switch (action) {
          case ACTIONS.NEXT:
            if (index < size - 1) {
              setStep(index + 1);
            }
            break;
          case ACTIONS.PREV:
            if (index > 0) {
              setStep(index - 1);
            }
            break;
          case ACTIONS.CLOSE:
            setRunning(false);
            setStep(0);
            break;
        }
        break;

      case EVENTS.TOUR_END:
        setRunning(false);
        setStep(0);
        break;
    }
  };

  // IMPORTANT: Storybook must be run in separate tab.
  return (
    <div className='app'>
      {/* https://docs.react-joyride.com/custom-components */}
      <Joyride
        continuous={true}
        run={running}
        steps={steps}
        stepIndex={step}
        callback={handleTour}
        // tooltipComponent={Tooltip}
      />

      <div className='flex flex-col space-y-8'>
        <div className='flex items-center gap-2 py-2' data-joyride='basic/1'>
          <Button data-joyride='basic/2' onClick={() => setRunning(true)}>
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
    steps: [
      {
        target: '[data-joyride="basic/1"]',
        content: 'Step 1',
      },
      {
        target: '[data-joyride="basic/2"]',
        content: 'Step 2',
      },
      {
        target: '[data-joyride="basic/3"]',
        content: 'Step 3',
      },
    ],
  },
};
