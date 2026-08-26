//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { random } from '@dxos/random';

import { withLayout, withTheme } from '../../testing';
import { Panel } from '../Panel';
import { Toolbar } from '../Toolbar';
import { Stepper, type StepperProps } from './Stepper';

const TICK_MS = 200;
/** Items in a counted stage; the line leaving it fills as they are worked through. */
const ITEMS = 10;
/**
 * Items completed per tick. Uneven, because real work is: a fixed step glides so smoothly that the
 * line's transition has nothing to smooth, and it lands the handover on the same beat every time.
 */
const step = () => random.number.int({ min: 1, max: 3 });

type StoryArgs = Partial<StepperProps> & {
  /** How many stages the plan starts with. */
  stages?: number;
};

/**
 * Drives a fixed plan from the first stage to the last, so the stepper is watched advancing rather
 * than sampled at rest. The stage count is switched from the toolbar, since the whole point of the
 * flexing lines is that the gaps stay even however many stages there are.
 */
const DefaultStory = ({ stages: initial = 5, indeterminate, ...props }: StoryArgs) => {
  const [stages, setStages] = useState(initial);
  const [active, setActive] = useState<number | undefined>(undefined);
  const [fraction, setFraction] = useState(0);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState<number | undefined>(undefined);
  const [run, setRun] = useState(0);
  const stopped = useRef(false);

  useEffect(() => {
    if (run === 0) {
      return;
    }

    stopped.current = false;
    let phase = 0;
    let count = 0;

    const interval = setInterval(() => {
      if (stopped.current) {
        return;
      }

      if (phase >= stages) {
        clearInterval(interval);
        // Past the last stage, not on it: a run parked on its final stage still reads as working,
        // and an uncounted one goes on spinning there for good.
        setActive(stages);
        setFraction(1);
        return;
      }

      count += indeterminate ? TICK_MS : step();
      setActive(phase);
      setFraction(indeterminate ? 0 : Math.min(1, count / ITEMS));
      if (count >= (indeterminate ? 2_000 : ITEMS)) {
        phase += 1;
        count = 0;
      }
    }, TICK_MS);

    return () => clearInterval(interval);
  }, [run, stages, indeterminate]);

  const reset = useCallback(
    (next = stages) => {
      stopped.current = true;
      // Ends the run rather than pausing it: changing `stages` re-runs the driving effect, which
      // would clear the stop flag and start over from the first stage.
      setRun(0);
      setStages(next);
      setActive(undefined);
      setFraction(0);
      setFailed(false);
      setSelected(undefined);
    },
    [stages],
  );

  const handleStart = useCallback(() => {
    stopped.current = true;
    setFailed(false);
    setActive(0);
    setFraction(0);
    setRun((run) => run + 1);
  }, []);

  return (
    <Panel.Root>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Toolbar.Button onClick={handleStart}>Start</Toolbar.Button>
          <Toolbar.Button onClick={() => (stopped.current = true)}>Stop</Toolbar.Button>
          <Toolbar.Button
            onClick={() => {
              stopped.current = true;
              setFailed(true);
            }}
          >
            Fail
          </Toolbar.Button>
          <Toolbar.Button onClick={() => reset()}>Reset</Toolbar.Button>
          <div className='flex-1' />
          {[2, 3, 5, 8].map((count) => (
            <Toolbar.Button key={count} onClick={() => reset(count)}>
              {String(count)}
            </Toolbar.Button>
          ))}
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content classNames='h-6' />
      <Panel.Statusbar>
        <Stepper
          steps={stages}
          active={active}
          fraction={fraction}
          indeterminate={indeterminate}
          error={failed}
          selected={selected}
          onSelect={(step) => setSelected((selected) => (selected === step.index ? undefined : step.index))}
          {...props}
        />
      </Panel.Statusbar>
    </Panel.Root>
  );
};

const meta = {
  title: 'ui/react-ui-core/components/Stepper',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'centered', classNames: 'w-[30rem]' })],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * A fixed plan: one circle per stage, joined by lines that flex so the gaps stay even at **3**, **5**
 * or **8** stages. The line leaving a stage fills as that stage is worked through, so the plan and
 * the progress within it are one drawing rather than two.
 */
export const Default: Story = {
  args: {
    stages: 5,
  },
};

/**
 * The same plan with nothing to count. No line can be drawn honestly, so the stage in flight spins
 * and its line stays empty until the run is past it.
 */
export const Indeterminate: Story = {
  args: {
    stages: 5,
    indeterminate: true,
  },
};
