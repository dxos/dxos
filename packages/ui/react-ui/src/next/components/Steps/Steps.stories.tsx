//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { translations } from '#translations';

import { withLayout, withTheme } from '../../../testing/index.ts';
import { SIZES } from '../../sizes.ts';
import { GEOMETRY, sizeRow } from '../../testing.ts';
import { SIZE_ARG_TYPES, type SizeArgs, withSizes } from '../../testing/stories.tsx';
import { Button, Steps, type StepsProps } from '../index.ts';

const TICK_MS = 200;
/** Items in a counted stage; the line leaving it fills as they are worked through. */
const ITEMS = 10;

type StoryArgs = SizeArgs & Pick<StepsProps, 'indeterminate' | 'error'> & { stages?: number };

/** Drives a plan from the first stage to the last, so it is watched advancing rather than sampled at rest. */
const DefaultStory = ({ stages = 5, indeterminate, error }: StoryArgs) => {
  const [tick, setTick] = useState(0);
  const [selected, setSelected] = useState<number | undefined>();
  useEffect(() => {
    const interval = setInterval(() => setTick((tick) => (tick + 1) % ((stages + 2) * ITEMS)), TICK_MS);
    return () => clearInterval(interval);
  }, [stages]);

  return (
    <Steps
      steps={['Plan', 'Build', 'Verify', 'Ship', 'Launch'].slice(0, stages).map((label) => ({ id: label, label }))}
      active={Math.floor(tick / ITEMS)}
      fraction={(tick % ITEMS) / ITEMS}
      indeterminate={indeterminate}
      error={error}
      selected={selected}
      onSelect={({ index }) => setSelected((selected) => (selected === index ? undefined : index))}
    />
  );
};

const meta = {
  title: 'ui/react-ui-core/components/Steps',
  render: DefaultStory,
  decorators: [withSizes(), withLayout({ classNames: 'p-0 w-[32rem]' }), withTheme()],
  args: { size: 'md', stages: 5, indeterminate: false, error: false },
  argTypes: { ...SIZE_ARG_TYPES, stages: { control: { type: 'range', min: 2, max: 5 } } },
  parameters: { layout: 'centered', translations },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Driven by hand, so the moment an advance, a failure or a reset is reported can be observed rather than caught. */
const TestStory = ({ size }: StoryArgs) => {
  const [active, setActive] = useState<number | undefined>(0);
  const [fraction, setFraction] = useState(1);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<number | undefined>();
  const testId = (name: string) => `${size}-${name}`;

  return (
    <>
      <div className='flex gap-2'>
        <Button
          data-testid={testId('advance')}
          onClick={() => {
            setActive((active) => (active ?? 0) + 1);
            setFraction(0.2);
          }}
        >
          Advance
        </Button>
        <Button data-testid={testId('fail')} onClick={() => setError(true)}>
          Fail
        </Button>
        <Button
          data-testid={testId('reset')}
          onClick={() => {
            setActive(undefined);
            setFraction(0);
            setError(false);
          }}
        >
          Reset
        </Button>
      </div>
      <Steps steps={4} active={active} fraction={fraction} error={error} data-testid={testId('steps')} />
      <Steps
        steps={[
          { id: 'plan', label: 'Plan' },
          { id: 'build', label: 'Build' },
          { id: 'ship', label: 'Ship' },
        ]}
        active={1}
        indeterminate
        selected={selected}
        onSelect={({ index }) => setSelected((selected) => (selected === index ? undefined : index))}
      />
    </>
  );
};

/** Every drawn line width (percent of its track), on each painted frame for `ms`. */
const sample = async (read: () => number[], ms: number): Promise<number[][]> => {
  const frames: number[][] = [];
  const until = performance.now() + ms;
  while (performance.now() < until) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
    frames.push(read());
  }
  return frames;
};

/**
 * Circles are icon-sized at every size and named; an advance holds the line it leaves full until it arrives, a reset
 * lands at once, a failure recolours only what the run reached, and selectable stages are toggle buttons.
 */
export const Test: Story = {
  render: TestStory,
  args: { allSizes: true },
  play: async ({ canvasElement }) => {
    for (const size of SIZES) {
      const indicators = sizeRow(canvasElement, size).querySelectorAll<HTMLElement>(
        '[data-scope="steps"][data-part="indicator"]',
      );
      await expect(indicators, size).toHaveLength(7);
      for (const indicator of indicators) {
        await expect(indicator.getBoundingClientRect().width, size).toBeCloseTo(GEOMETRY[size].icon, 0);
      }
    }

    const row = sizeRow(canvasElement, 'md');
    const canvas = within(row);
    const steps = canvas.getByTestId('md-steps');
    await expect(steps).toHaveAttribute('role', 'list');
    await expect(within(steps).getAllByRole('listitem')).toHaveLength(4);
    await expect(within(steps).getByRole('img', { name: 'Step 1' })).toBeVisible();

    const widths = () =>
      [...steps.querySelectorAll<HTMLElement>('[data-part="separator"]')].map((track) => {
        const fill = track.firstElementChild;
        return fill ? Math.round((fill.getBoundingClientRect().width / track.getBoundingClientRect().width) * 100) : 0;
      });
    const colours = () =>
      [...steps.querySelectorAll<HTMLElement>('[data-part="indicator"]')].map(
        (indicator) => getComputedStyle(indicator).backgroundColor,
      );

    // The first stage counted to its end.
    await waitFor(() => expect(widths()).toEqual([100, 0, 0]));

    // An advance reports the next stage with almost nothing counted; the line it leaves must not snap back meanwhile.
    canvas.getByTestId('md-advance').click();
    const advancing = await sample(widths, 700);
    await expect(Math.min(...advancing.map((frame) => frame[0]))).toEqual(100);
    await waitFor(() => expect(widths()).toEqual([100, 20, 0]));
    await expect(within(steps).getAllByRole('listitem')[1]).toHaveAttribute('aria-current', 'step');

    // A failure recolours every stage the run reached, and leaves the one it never reached as an outline.
    const [reached, , , ahead] = colours();
    canvas.getByTestId('md-fail').click();
    await waitFor(() => expect(colours()[0]).not.toBe(reached));
    const failed = colours();
    await expect(failed[1]).toBe(failed[0]);
    await expect(failed[3]).toBe(ahead);

    // A reset has no line in flight to finish, so it lands at once.
    canvas.getByTestId('md-reset').click();
    const resetting = await sample(widths, 200);
    await expect(Math.max(...resetting.map((frame) => Math.max(...frame)))).toEqual(0);

    // An uncounted stage spins, and selectable stages toggle.
    const build = canvas.getByRole('button', { name: 'Build' });
    await expect(getComputedStyle(build, '::after').animationName).toBe('dx-spin');
    await expect(build).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(build);
    await expect(build).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(build);
    await expect(build).toHaveAttribute('aria-pressed', 'false');
  },
};
