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
import { type CSSVariables } from './Container.tsx';

/** A narrow reading width, so the story's pane is wider than the document. */
const READING_WIDTH: CSSVariables = { '--spacing-document-max-width': '20rem' };

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

/** Three tracks: a cell across two, a one-track cell, then a cell across all three (`span='full'`). */
const Spans = ({ size }: { size: Size }) => (
  <Next.Container layout='row' columns='repeat(3, minmax(0, 1fr))' data-testid={`spans-${size}`}>
    <Next.Container span={2} data-testid={`span-two-${size}`}>
      <Next.Input aria-label='Two tracks' />
    </Next.Container>
    <Next.Container data-testid={`span-one-${size}`}>
      <Next.Input aria-label='One track' />
    </Next.Container>
    <Next.Container span='full' data-testid={`span-full-${size}`}>
      <Next.Input aria-label='Every track' />
    </Next.Container>
  </Next.Container>
);

/**
 * Two groups side by side, the second across two of three tracks: each cell of the row names its own edge lines, so
 * the inheriting group inside it (and anything inheriting below that) aligns within the cell rather than the form,
 * whose `content-*` lines a cell away from the row's edges does not reach.
 */
const SideBySide = ({ size }: { size: Size }) => (
  <Next.Container layout='row' columns='repeat(3, minmax(0, 1fr))' gap='md' data-testid={`split-${size}`}>
    {(['left', 'right'] as const).map((side) => (
      <Next.Container key={side} span={side === 'left' ? 1 : 2} data-testid={`split-${side}-${size}`}>
        <Next.Typography>{side === 'left' ? 'Shipping' : 'Billing'}</Next.Typography>
        <Next.Container data-testid={`split-${side}-group-${size}`}>
          <Next.Input aria-label={`${side} street`} data-testid={`split-${side}-input-${size}`} />
          <Next.Container layout='row' columns='auto minmax(0, 1fr)' data-testid={`split-${side}-row-${size}`}>
            <Next.Label classNames='pe-(--nx-gap-size)'>City</Next.Label>
            <Next.Input aria-label={`${side} city`} data-testid={`split-${side}-city-${size}`} />
          </Next.Container>
        </Next.Container>
      </Next.Container>
    ))}
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
    <Spans size={size} />
    <Next.Container gutter='rail' width='document' style={READING_WIDTH} data-testid={`reading-${size}`}>
      <Next.Typography>At the document width</Next.Typography>
    </Next.Container>
    <SideBySide size={size} />
    {narrow && (
      <div className='@container w-[20rem]'>
        <Section size={size} prefix='narrow-' />
      </div>
    )}
  </>
);

const meta = {
  title: 'ui/react-ui-core/components/Container',
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
 * `gap` spaces rows only (0.75rem for `lg`), leaving the shared columns alone. `span` places a child across tracks
 * (a count, or `full` for the whole content area), and each cell of a `row` provides its own edge lines, so groups
 * inheriting inside side-by-side cells align within their own column. `width='document'` caps a template root at the
 * reading width and centres it.
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
    for (const size of SIZES) {
      const reading = rect(canvasElement, `reading-${size}`);
      const row = rect(canvasElement, `size-${size}`);
      await expect(reading.width, size).toBeCloseTo(320, 0);
      await expect(reading.left - row.left, size).toBeCloseTo(row.right - reading.right, 0);
    }

    for (const size of SIZES) {
      const spans = rect(canvasElement, `spans-${size}`);
      const track = spans.width / 3;
      const two = rect(canvasElement, `span-two-${size}`);
      const one = rect(canvasElement, `span-one-${size}`);
      const full = rect(canvasElement, `span-full-${size}`);
      await expect(two.left, size).toBeCloseTo(spans.left, 0);
      await expect(two.width, size).toBeCloseTo(2 * track, 0);
      await expect(one.left, size).toBeCloseTo(two.right, 0);
      await expect(one.width, size).toBeCloseTo(track, 0);
      await expect(full.top, size).toBeGreaterThanOrEqual(two.bottom);
      await expect(full.left, size).toBeCloseTo(spans.left, 0);
      await expect(full.width, size).toBeCloseTo(spans.width, 0);
      await expect(getComputedStyle(byTestId(canvasElement, `span-two-${size}`)).gridColumnEnd).toBe('span 2');

      const left = rect(canvasElement, `split-left-${size}`);
      const right = rect(canvasElement, `split-right-${size}`);
      await expect(right.left - left.right, size).toBeCloseTo(8, 0);
      await expect(right.width, size).toBeCloseTo(2 * left.width + 8, 0);
      await expect(left.top, size).toBeCloseTo(right.top, 0);
      for (const [side, cell] of [
        ['left', left],
        ['right', right],
      ] as const) {
        for (const part of ['group', 'input', 'row']) {
          const inner = rect(canvasElement, `split-${side}-${part}-${size}`);
          await expect(inner.left, `${side} ${part} ${size}`).toBeCloseTo(cell.left, 0);
          await expect(inner.right, `${side} ${part} ${size}`).toBeCloseTo(cell.right, 0);
        }
        await expect(rect(canvasElement, `split-${side}-city-${size}`).right, `${side} city ${size}`).toBeCloseTo(
          cell.right,
          0,
        );
      }
    }

    await expect(rect(canvasElement, 'narrow-row-md-input').top).toBeGreaterThan(
      rect(canvasElement, 'narrow-row-md-label').top,
    );
    await expect(rect(canvasElement, 'narrow-row-md-input').left).toBeCloseTo(
      rect(canvasElement, 'narrow-row-md-label').left,
      0,
    );
  },
};
