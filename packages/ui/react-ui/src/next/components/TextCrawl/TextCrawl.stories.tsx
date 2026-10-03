//
// Copyright 2025 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useState } from 'react';
import { expect, waitFor, within } from 'storybook/test';

import { random } from '@dxos/random';

import { withLayout, withTheme } from '../../../testing/index.ts';
import { SIZES } from '../../sizes.ts';
import { sizeRow } from '../../testing.ts';
import { SIZE_ARG_TYPES, type SizeArgs, withSizes } from '../../testing/stories.tsx';
import { Button, TextCrawl, type TextCrawlProps } from '../index.ts';

random.seed(1234);

const createLines = (length = random.number.int({ min: 2, max: 10 })) =>
  Array.from({ length }, (_, i) => `[${i + 1}/${length}] ${random.lorem.paragraph()}`);

const LINES = createLines(6);

const digits = '0123456789'.split('');

type StoryArgs = SizeArgs & Pick<TextCrawlProps, 'autoAdvance' | 'cyclic' | 'minDuration' | 'transition'>;

const DefaultStory = (args: StoryArgs) => {
  const [lines, setLines] = useState(LINES);
  const [count, setCount] = useState(123);
  const counter = String(count).padStart(5, '0');
  useEffect(() => {
    const interval = setInterval(() => setCount((count) => count + 1), 1_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <div className='flex gap-2'>
        <Button onClick={() => setLines((lines) => [...lines, `[${lines.length + 1}] ${random.lorem.sentence()}`])}>
          Add
        </Button>
        <Button onClick={() => setLines(createLines())}>Generate</Button>
        <Button onClick={() => setLines([])}>Clear</Button>
      </div>
      <TextCrawl lines={lines} autoAdvance={args.autoAdvance} cyclic={args.cyclic} transition={args.transition} />
      <TextCrawl lines={lines} autoAdvance greedy />
      <div className='flex font-mono'>
        {Array.from({ length: 5 }, (_, i) => (
          <TextCrawl key={i} lines={digits} index={digits.indexOf(counter[i])} transition={100} cyclic />
        ))}
      </div>
    </>
  );
};

const meta = {
  title: 'ui/react-ui-core/components/TextCrawl',
  render: DefaultStory,
  decorators: [withSizes(), withLayout({ classNames: 'p-0 w-[32rem]' }), withTheme()],
  args: { size: 'md', autoAdvance: true, cyclic: true, transition: 500 },
  argTypes: SIZE_ARG_TYPES,
  parameters: { layout: 'centered' },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

const TestStory = ({ size }: StoryArgs) => {
  const [index, setIndex] = useState(0);
  return (
    <>
      <Button data-testid={`${size}-next`} onClick={() => setIndex((index) => index + 1)}>
        Next
      </Button>
      <TextCrawl lines={LINES} index={index} transition={100} data-testid={`${size}-controlled`} />
      <TextCrawl lines={LINES} greedy data-testid={`${size}-greedy`} />
    </>
  );
};

/** The window is one line tall at every size, a controlled index scrolls to its line, and greedy rests on the last. */
export const Test: Story = {
  render: TestStory,
  args: { allSizes: true },
  play: async ({ canvasElement }) => {
    const visibleText = (crawl: HTMLElement) => {
      const window = crawl.getBoundingClientRect();
      return [...crawl.querySelectorAll<HTMLElement>('[data-part="line"]')]
        .filter((line) => Math.abs(line.getBoundingClientRect().top - window.top) < 1)
        .map((line) => line.textContent);
    };

    for (const size of SIZES) {
      const crawl = within(sizeRow(canvasElement, size)).getByTestId(`${size}-controlled`);
      const lineHeight = parseFloat(getComputedStyle(crawl).lineHeight);
      await expect(crawl.getBoundingClientRect().height, size).toBeCloseTo(lineHeight, 0);
      const line = crawl.querySelector<HTMLElement>('[data-part="line"]');
      await expect(line?.getBoundingClientRect().height, size).toBeCloseTo(lineHeight, 0);
    }

    const canvas = within(sizeRow(canvasElement, 'md'));
    const controlled = canvas.getByTestId('md-controlled');
    await expect(visibleText(controlled)).toEqual([LINES[0]]);

    // Only the shown line is exposed to assistive tech.
    const lines = controlled.querySelectorAll('[data-part="line"]');
    await expect(lines[0]).not.toHaveAttribute('aria-hidden');
    await expect(lines[1]).toHaveAttribute('aria-hidden', 'true');

    // A controlled index scrolls to its line.
    canvas.getByTestId('md-next').click();
    await waitFor(() => expect(visibleText(controlled)).toEqual([LINES[1]]));
    await expect(lines[1]).toHaveAttribute('data-active');
    await expect(lines[0]).toHaveAttribute('aria-hidden', 'true');

    // Greedy arrives at the last line without scrolling there.
    await expect(visibleText(canvas.getByTestId('md-greedy'))).toEqual([LINES[LINES.length - 1]]);
  },
};
