//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect } from 'storybook/test';

import { withTheme } from '../../../testing/index.ts';
import { Next } from '../../Next.tsx';
import { type Size, SIZES } from '../../sizes.ts';
import { GEOMETRY, byTestId, centreY, controlSize, expectScoped } from '../../testing.ts';

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

const Section = ({ size }: { size: Size }) => (
  <Next.Container size={size} gutter='rail' columns={LABEL_COLUMNS} level='base' data-testid={`section-${size}`}>
    <Row id={`name-${size}`} label='Name' testId={`row-${size}`} />
    <Next.Container data-testid={`nested-${size}`}>
      <Row id={`city-${size}`} label='A much longer label' testId={`nested-row-${size}`} />
    </Next.Container>
    <div data-place='full' className='h-2 bg-accent-bg' data-testid={`full-${size}`} />
    <Next.Container level='+1' data-testid={`raised-${size}`}>
      <Row id={`note-${size}`} label='Raised' testId={`raised-row-${size}`} />
    </Next.Container>
  </Next.Container>
);

type StoryArgs = {
  width?: string;
};

const DefaultStory = ({ width = '36rem' }: StoryArgs) => (
  <div className='nx-scope @container flex flex-col gap-2' data-size='md' style={{ width }}>
    {SIZES.map((size) => (
      <Section key={size} size={size} />
    ))}
  </div>
);

const meta = {
  title: 'ui/react-ui-core/next/container',
  render: DefaultStory,
  decorators: [withTheme()],
  parameters: { layout: 'centered' },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

const rect = (root: HTMLElement, testId: string) => byTestId(root, testId).getBoundingClientRect();

export const Default: Story = {};

/** A row is one block tall and centres its control (finding 11). */
export const Geometry: Story = {
  play: async ({ canvasElement }) => {
    for (const size of SIZES) {
      const row = rect(canvasElement, `row-${size}`);
      const input = rect(canvasElement, `row-${size}-input`);
      await expect(row.height, size).toBeCloseTo(GEOMETRY[size].block, 0);
      await expect(input.height, size).toBeCloseTo(controlSize(size), 0);
      await expect(centreY(input), size).toBeCloseTo(centreY(row), 0);
    }
    await expectScoped(canvasElement);
  },
};

/** Rails, the content-sized label track and full bleed line up across nested (subgrid) containers. */
export const Alignment: Story = {
  play: async ({ canvasElement }) => {
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
  },
};

/** `level='+1'` steps one rung above its host without leaving the host's tracks (finding 8). */
export const Levels: Story = {
  play: async ({ canvasElement }) => {
    const section = getComputedStyle(byTestId(canvasElement, 'section-md'));
    const raised = getComputedStyle(byTestId(canvasElement, 'raised-md'));
    await expect(raised.backgroundColor).not.toBe(section.backgroundColor);
    await expect(Number(raised.getPropertyValue('--nx-level').trim())).toBe(
      Number(section.getPropertyValue('--nx-level').trim()) + 1,
    );
  },
};

/** Below the query threshold rails collapse to the inset and the label stacks above its input. */
export const Narrow: Story = {
  args: { width: '20rem' },
  play: async ({ canvasElement }) => {
    await expect(rect(canvasElement, 'row-md-rail-start').width).toBe(0);
    await expect(rect(canvasElement, 'row-md-input').top).toBeGreaterThan(rect(canvasElement, 'row-md-label').top);
    await expect(rect(canvasElement, 'row-md-input').left).toBeCloseTo(rect(canvasElement, 'row-md-label').left, 0);
  },
};
