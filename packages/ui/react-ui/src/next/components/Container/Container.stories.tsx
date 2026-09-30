//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect } from 'storybook/test';

import { withLayout, withTheme } from '../../../testing/index.ts';
import { Next } from '../../Next.tsx';
import { type Size, SIZES } from '../../sizes.ts';
import { GEOMETRY, byTestId, centreY, controlSize, expectScoped } from '../../testing.ts';
import { SIZE_ARG_TYPES, type SizeArgs, withSizes } from '../../testing/stories.tsx';

const LABEL_COLUMNS = 'auto [field-start] minmax(0, 1fr)';

const Row = ({ id, label, testId }: { id: string; label: string; testId: string }) => (
  <Next.Container layout='row' data-testid={testId}>
    <Next.Block rail='start' data-testid={`${testId}-rail-start`}>
      <Next.Icon icon='ph--user--regular' />
    </Next.Block>
    <Next.Label htmlFor={id} classNames='pe-(--nx-gap-size)' data-testid={`${testId}-label`}>
      {label}
    </Next.Label>
    <Next.Input id={id} data-testid={`${testId}-input`} />
    <Next.Block rail='end' data-testid={`${testId}-rail-end`}>
      <Next.Icon icon='ph--x--regular' />
    </Next.Block>
  </Next.Container>
);

/** A labelled row, a nested (subgrid) row, a full-bleed strip and a raised row; `prefix` keeps test ids unique. */
const Section = ({ size, prefix = '' }: { size: Size; prefix?: string }) => (
  <Next.Container gutter='rail' columns={LABEL_COLUMNS} level='base' data-testid={`${prefix}section-${size}`}>
    <Row id={`${prefix}name-${size}`} label='Name' testId={`${prefix}row-${size}`} />
    <Next.Container data-testid={`${prefix}nested-${size}`}>
      <Row id={`${prefix}city-${size}`} label='A much longer label' testId={`${prefix}nested-row-${size}`} />
    </Next.Container>
    <div data-place='full' className='h-2 bg-accent-bg' data-testid={`${prefix}full-${size}`} />
    <Next.Container level='+1' data-testid={`${prefix}raised-${size}`}>
      <Row id={`${prefix}note-${size}`} label='Raised' testId={`${prefix}raised-row-${size}`} />
    </Next.Container>
  </Next.Container>
);

type StoryArgs = SizeArgs & {
  /** Also render the section in a pane below the query threshold. */
  narrow?: boolean;
};

const DefaultStory = ({ size = 'md', narrow }: StoryArgs) => (
  <>
    <Section size={size} />
    <Next.Container gap='lg' data-testid={`gap-${size}`}>
      <Next.Typography data-testid={`gap-first-${size}`}>A stack with a large row gap</Next.Typography>
      <Next.Typography data-testid={`gap-second-${size}`}>between its children</Next.Typography>
    </Next.Container>
    {narrow && (
      <div className='@container w-[20rem]'>
        <Section size={size} prefix='narrow-' />
      </div>
    )}
  </>
);

const meta = {
  title: 'ui/react-ui-core/next/components/Container',
  render: DefaultStory,
  decorators: [withSizes(), withLayout({ classNames: 'p-0 w-[38rem]' }), withTheme()],
  args: { size: 'md' },
  argTypes: SIZE_ARG_TYPES,
  parameters: { layout: 'centered' },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

const rect = (root: HTMLElement, testId: string) => byTestId(root, testId).getBoundingClientRect();

export const Default: Story = {};

/**
 * A row is one block tall and centres its control (finding 11); rails, the content-sized label track and full bleed
 * line up across nested (subgrid) containers; `level='+1'` steps one rung above its host without leaving the host's
 * tracks (finding 8); below the query threshold rails collapse to the inset and the label stacks above its input.
 * `gap` spaces rows only (0.75rem for `lg`), leaving the shared columns alone.
 */
export const Test: Story = {
  args: { allSizes: true, narrow: true },
  play: async ({ canvasElement }) => {
    for (const size of SIZES) {
      const row = rect(canvasElement, `row-${size}`);
      const input = rect(canvasElement, `row-${size}-input`);
      await expect(row.height, size).toBeCloseTo(GEOMETRY[size].block, 0);
      await expect(input.height, size).toBeCloseTo(controlSize(size), 0);
      await expect(centreY(input), size).toBeCloseTo(centreY(row), 0);
    }
    await expectScoped(canvasElement);

    const first = rect(canvasElement, 'gap-first-md');
    const second = rect(canvasElement, 'gap-second-md');
    await expect(second.top - first.bottom).toBeCloseTo(12, 0);
    await expect(second.left).toBeCloseTo(first.left, 0);
    await expect(getComputedStyle(byTestId(canvasElement, 'gap-md')).columnGap).toBe('normal');

    for (const size of SIZES) {
      const section = rect(canvasElement, `section-${size}`);
      const start = rect(canvasElement, `row-${size}-rail-start`);
      const end = rect(canvasElement, `row-${size}-rail-end`);
      const input = rect(canvasElement, `row-${size}-input`);
      await expect(start.left, size).toBeCloseTo(section.left, 0);
      await expect(end.right, size).toBeCloseTo(section.right, 0);
      for (const row of [`nested-row-${size}`, `raised-row-${size}`]) {
        await expect(rect(canvasElement, `${row}-rail-start`).left, row).toBeCloseTo(start.left, 0);
        await expect(rect(canvasElement, `${row}-rail-end`).right, row).toBeCloseTo(end.right, 0);
        await expect(rect(canvasElement, `${row}-input`).left, row).toBeCloseTo(input.left, 0);
      }
      const full = rect(canvasElement, `full-${size}`);
      await expect(full.left, size).toBeCloseTo(section.left, 0);
      await expect(full.right, size).toBeCloseTo(section.right, 0);
    }

    const section = getComputedStyle(byTestId(canvasElement, 'section-md'));
    const raised = getComputedStyle(byTestId(canvasElement, 'raised-md'));
    await expect(raised.backgroundColor).not.toBe(section.backgroundColor);
    await expect(Number(raised.getPropertyValue('--nx-level').trim())).toBe(
      Number(section.getPropertyValue('--nx-level').trim()) + 1,
    );

    await expect(rect(canvasElement, 'narrow-row-md-rail-start').width).toBe(0);
    await expect(rect(canvasElement, 'narrow-row-md-input').top).toBeGreaterThan(
      rect(canvasElement, 'narrow-row-md-label').top,
    );
    await expect(rect(canvasElement, 'narrow-row-md-input').left).toBeCloseTo(
      rect(canvasElement, 'narrow-row-md-label').left,
      0,
    );
  },
};
