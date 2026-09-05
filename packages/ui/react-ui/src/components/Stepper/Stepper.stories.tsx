//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { expect, waitFor, within } from 'storybook/test';

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

/**
 * Drives the plan by hand rather than on a timer, so the moment an advance is reported can be
 * observed rather than caught.
 */
const HandoverStory = ({ stages = 3 }: StoryArgs) => {
  const [active, setActive] = useState<number | undefined>(0);
  const [fraction, setFraction] = useState(1);

  return (
    <div className='flex flex-col gap-4 w-full'>
      <Toolbar.Root>
        {/* What a run does at the moment it starts the next stage: it reports the new stage and a
            count of almost nothing, both in the same update. */}
        <Toolbar.Button
          data-testid='stepper.advance'
          onClick={() => {
            setActive((active) => (active ?? 0) + 1);
            setFraction(0.2);
          }}
        >
          Advance
        </Toolbar.Button>
        <Toolbar.Button
          data-testid='stepper.reset'
          onClick={() => {
            setActive(undefined);
            setFraction(0);
          }}
        >
          Reset
        </Toolbar.Button>
      </Toolbar.Root>
      <Stepper steps={stages} active={active} fraction={fraction} />
    </div>
  );
};

/**
 * Every drawn width, on each painted frame for `ms`. Read after the frame rather than before it, so
 * the first reading is of what the click actually drew rather than of what was on screen before it.
 */
const sample = async (read: () => number[], ms: number): Promise<number[][]> => {
  const frames: number[][] = [];
  const until = performance.now() + ms;
  while (performance.now() < until) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
    frames.push(read());
  }
  return frames;
};

export const TestHandover: Story = {
  render: HandoverStory,
  args: { stages: 3 },
  // Sampled every frame rather than asserted at an instant: what makes the stepper wrong is a line
  // that goes backwards at some point during the window, which a single reading after the click is
  // free to miss entirely.
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // The computed width, not the inline one: a line easing to its target is drawn at neither end
    // for the length of the transition, and it is exactly those frames that show a line retreating.
    const widths = () =>
      [...canvasElement.querySelectorAll<HTMLElement>('[data-scope="steps"][data-part="separator"]')].map((track) => {
        const fill = track.firstElementChild;
        return fill ? Math.round((fill.getBoundingClientRect().width / track.getBoundingClientRect().width) * 100) : 0;
      });

    // The first stage, counted to its end.
    await waitFor(async () => expect(widths()).toEqual([100, 0]));

    // A run reports the next stage the instant it starts it, with a count of almost nothing. The
    // line leaving the stage being left has to stay at its end while it hands over — without that
    // it snaps back to the new count and the reader sees the stepper run backwards.
    canvas.getByTestId('stepper.advance').click();
    const advancing = await sample(widths, 800);
    await expect(Math.min(...advancing.map((frame) => frame[0]))).toEqual(100);
    await waitFor(async () => expect(widths()).toEqual([100, 20]));

    // A reset has no line in flight to finish, so it lands at once: easing back to nothing would
    // read as progress in reverse.
    canvas.getByTestId('stepper.reset').click();
    const resetting = await sample(widths, 200);
    await expect(Math.max(...resetting.map((frame) => Math.max(...frame)))).toEqual(0);
  },
};

/** Holds a plan part-way through so the failure can be applied to a run that has made progress. */
const FailureStory = ({ stages = 4 }: StoryArgs) => {
  const [failed, setFailed] = useState(false);

  return (
    <div className='flex flex-col gap-4 w-full'>
      <Toolbar.Root>
        <Toolbar.Button data-testid='stepper.fail' onClick={() => setFailed(true)}>
          Fail
        </Toolbar.Button>
      </Toolbar.Root>
      <Stepper steps={stages} active={2} fraction={0.5} error={failed} />
    </div>
  );
};

export const TestFailure: Story = {
  render: FailureStory,
  args: { stages: 4 },
  // A run that failed is drawn in the error hue throughout: a plan half-drawn in the accent
  // would read as half of it having gone fine.
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Resolved from the theme rather than written down, so the test says "the error hue" and not a
    // particular colour the theme is free to change.
    const swatch = (classNames: string) => {
      const probe = document.createElement('div');
      probe.className = `border ${classNames}`;
      canvasElement.append(probe);
      const { backgroundColor, borderTopColor } = getComputedStyle(probe);
      probe.remove();
      return { backgroundColor, borderTopColor };
    };
    const errorSurface = swatch('bg-error-surface').backgroundColor;
    const separator = swatch('border-separator').borderTopColor;
    const accent = swatch('bg-accent-bg').backgroundColor;

    const circles = () =>
      [...canvasElement.querySelectorAll('[data-scope="steps"][data-part="item"] [role="img"]')].map((circle) => {
        const { backgroundColor, borderTopColor } = getComputedStyle(circle);
        return { backgroundColor, borderTopColor };
      });

    await waitFor(async () => expect(circles()).toHaveLength(4));
    // Stages the run reached are filled in the accent; the one ahead of it is an outline.
    await expect(circles().map((circle) => circle.backgroundColor === accent)).toEqual([true, true, true, false]);

    canvas.getByTestId('stepper.fail').click();

    // Every stage the run started now reads as failed, so the progress behind the failure does not
    // read as having gone fine.
    await waitFor(async () =>
      expect(circles().map((circle) => circle.backgroundColor === errorSurface)).toEqual([true, true, true, false]),
    );
    await expect(circles().every((circle) => circle.backgroundColor !== accent)).toEqual(true);

    // The stage it never reached is untouched: it did not fail, and colouring it would claim the
    // failure reached further than it did.
    await expect(circles()[3].borderTopColor).toEqual(separator);
  },
};
