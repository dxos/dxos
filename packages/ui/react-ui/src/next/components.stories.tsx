//
// Copyright 2026 DXOS.org
//

import './theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useLayoutEffect, useRef } from 'react';
import { expect } from 'storybook/test';

import { log } from '@dxos/log';

import { withTheme } from '../testing/index.ts';
import { Next } from './Next.tsx';
import { type Size, SIZES } from './sizes.ts';
import { byTestId } from './testing.ts';

const LABEL_COLUMNS = 'auto [field-start] minmax(0, 1fr)';

const OPTIONS: Next.SelectOption[] = [
  { value: 'red', label: 'Red' },
  { value: 'green', label: 'Green' },
  { value: 'blue', label: 'Blue' },
];

const SizeSection = ({ size }: { size: Size }) => (
  <Next.Container size={size} gutter='rail' columns={LABEL_COLUMNS} data-testid={`section-${size}`}>
    <Next.Toolbar data-testid={`toolbar-${size}`}>
      <Next.Block>
        <Next.Icon icon='ph--circle--regular' />
      </Next.Block>
      <Next.IconButton icon='ph--plus--regular' label={`Add ${size}`} data-testid={`add-${size}`} />
      <Next.IconButton icon='ph--minus--regular' label={`Remove ${size}`} data-testid={`remove-${size}`} />
      <Next.Button data-testid={`button-${size}`}>Save</Next.Button>
      <Next.Input placeholder='Search' aria-label={`Search ${size}`} data-testid={`input-${size}`} />
      <Next.Select.Root items={OPTIONS} positioning={{ sameWidth: true }}>
        <Next.Select.Trigger placeholder='Color' aria-label={`Color ${size}`} data-testid={`select-${size}`} />
        <Next.Select.Content size={size} data-testid={`listbox-${size}`}>
          {OPTIONS.map((item) => (
            <Next.Select.Item key={item.value} item={item} />
          ))}
        </Next.Select.Content>
      </Next.Select.Root>
    </Next.Toolbar>

    <Next.Container layout='row' data-testid={`row-${size}`}>
      <Next.Block rail='start' data-testid={`row-${size}-rail-start`}>
        <Next.Icon icon='ph--user--regular' />
      </Next.Block>
      <Next.Label htmlFor={`name-${size}`} classNames='pe-(--nx-gap-size)'>
        Name
      </Next.Label>
      <Next.Input id={`name-${size}`} data-testid={`row-input-${size}`} />
      <Next.Block rail='end'>
        <Next.Icon icon='ph--x--regular' label={`Clear ${size}`} />
      </Next.Block>
    </Next.Container>

    <Next.Container>
      <Next.Checkbox label={`Subscribe ${size}`} defaultChecked data-testid={`checkbox-${size}`} />
    </Next.Container>

    <Next.Field.Root data-testid={`field-${size}`}>
      <Next.Field.Label>Email {size}</Next.Field.Label>
      <Next.Input data-testid={`field-input-${size}`} />
      <Next.Field.HelperText>We never share it.</Next.Field.HelperText>
    </Next.Field.Root>

    <Next.Field.Root invalid>
      <Next.Field.Label>Website</Next.Field.Label>
      <Next.Input defaultValue='not a url' />
      <Next.Field.ErrorText>Enter a valid URL.</Next.Field.ErrorText>
    </Next.Field.Root>

    <Next.Container>
      <Next.Block rail='start'>
        <Next.Icon icon='ph--chat-circle--regular' />
      </Next.Block>
      <Next.Typography>
        Typography centres its first line in the block, so the icon beside it lines up however far it wraps.
      </Next.Typography>
    </Next.Container>
  </Next.Container>
);

const DefaultStory = () => (
  <div className='nx-scope @container flex flex-col gap-4 w-[40rem]' data-size='md'>
    {SIZES.map((size) => (
      <SizeSection key={size} size={size} />
    ))}
  </div>
);

const meta = {
  title: 'ui/react-ui-core/next/components',
  render: DefaultStory,
  decorators: [withTheme()],
  parameters: { layout: 'centered' },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

/** Cross-component gallery; per-component assertions live in each component's own stories. */
export const Default: Story = {};

//
// Benchmark
//

const ROWS = Array.from({ length: 1_000 }, (_, index) => index);

/** 1,000 rows in a nested Container inside a ScrollArea (decision 11); the mount-to-layout time is recorded. */
const BenchmarkStory = () => {
  const start = useRef(performance.now());
  const rootRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    // Reading geometry forces style and layout, so the time covers subgrid and `:has` resolution.
    rootRef.current?.getBoundingClientRect();
    rootRef.current?.setAttribute('data-render-ms', (performance.now() - start.current).toFixed(1));
  }, []);

  return (
    <div ref={rootRef} className='nx-scope @container flex flex-col h-[40rem] w-[40rem]' data-size='md'>
      <Next.ScrollArea.Root classNames='flex-1'>
        <Next.ScrollArea.Viewport asChild>
          <Next.Container gutter='rail' columns={LABEL_COLUMNS} data-testid='benchmark-body'>
            <Next.Container data-testid='benchmark-nested'>
              {ROWS.map((index) => (
                <Next.Container key={index} layout='row' data-testid={`bench-${index}`}>
                  <Next.Block rail='start'>
                    <Next.Icon icon='ph--circle--regular' />
                  </Next.Block>
                  <Next.Label>Row {index}</Next.Label>
                  <Next.Typography>Value {index}</Next.Typography>
                  <Next.Block rail='end'>
                    <Next.Icon icon='ph--dots-three--regular' />
                  </Next.Block>
                </Next.Container>
              ))}
            </Next.Container>
          </Next.Container>
        </Next.ScrollArea.Viewport>
      </Next.ScrollArea.Root>
    </div>
  );
};

export const Benchmark: Story = {
  render: BenchmarkStory,
  play: async ({ canvasElement }) => {
    const rows = canvasElement.querySelectorAll('[data-testid^="bench-"]');
    await expect(rows).toHaveLength(ROWS.length);
    // The last row still shares the first row's subgrid tracks.
    const first = byTestId(canvasElement, 'bench-0').children[1].getBoundingClientRect();
    const last = byTestId(canvasElement, `bench-${ROWS.length - 1}`).children[1].getBoundingClientRect();
    await expect(last.left).toBeCloseTo(first.left, 0);
    const root = canvasElement.querySelector('[data-render-ms]');
    // eslint-disable-next-line no-console
    log.info('benchmark', { rows: ROWS.length, ms: root?.getAttribute('data-render-ms') });
  },
};
