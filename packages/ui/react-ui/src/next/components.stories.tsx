//
// Copyright 2026 DXOS.org
//

import './theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useLayoutEffect, useRef } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withTheme } from '../testing/index.ts';
import { Next } from './components.tsx';
import { type Size, SIZES } from './sizes.ts';

const LABEL_COLUMNS = 'auto [field-start] minmax(0, 1fr)';

const OPTIONS: Next.SelectOption[] = [
  { value: 'red', label: 'Red' },
  { value: 'green', label: 'Green' },
  { value: 'blue', label: 'Blue' },
];

/** Expected geometry per size in px (decision 12); asserting literals checks the theme, not just self-consistency. */
const GEOMETRY: Record<Size, { block: number; inset: number; icon: number }> = {
  xs: { block: 20, inset: 1, icon: 12 },
  sm: { block: 24, inset: 2, icon: 14 },
  md: { block: 32, inset: 2, icon: 16 },
  lg: { block: 40, inset: 3, icon: 20 },
  xl: { block: 48, inset: 3, icon: 24 },
};

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

const byTestId = (root: HTMLElement, testId: string) => {
  const element = root.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
  if (!element) {
    throw new Error(`missing ${testId}`);
  }
  return element;
};

const centreY = (rect: DOMRect) => rect.top + rect.height / 2;

/** Every control is `block - 2 * inset` tall and vertically centred in its block (decision 12). */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    for (const size of SIZES) {
      const { block, inset, icon } = GEOMETRY[size];
      const control = block - 2 * inset;

      const toolbar = byTestId(canvasElement, `toolbar-${size}`).getBoundingClientRect();
      await expect(toolbar.height).toBeCloseTo(block, 0);
      for (const part of ['add', 'remove', 'button', 'input', 'select']) {
        const rect = byTestId(canvasElement, `${part}-${size}`).getBoundingClientRect();
        await expect(rect.height, `${part}-${size} height`).toBeCloseTo(control, 0);
        await expect(centreY(rect), `${part}-${size} centre`).toBeCloseTo(centreY(toolbar), 0);
      }
      // Icon-only buttons are square.
      await expect(byTestId(canvasElement, `add-${size}`).getBoundingClientRect().width).toBeCloseTo(control, 0);

      // One icon scale: a control's icon matches a rail Block's.
      const railIcon = byTestId(canvasElement, `row-${size}-rail-start`).querySelector('svg');
      const buttonIcon = byTestId(canvasElement, `add-${size}`).querySelector('svg');
      await expect(railIcon?.getBoundingClientRect().width).toBeCloseTo(icon, 0);
      await expect(buttonIcon?.getBoundingClientRect().width).toBeCloseTo(icon, 0);

      const row = byTestId(canvasElement, `row-${size}`).getBoundingClientRect();
      const rowInput = byTestId(canvasElement, `row-input-${size}`).getBoundingClientRect();
      await expect(row.height).toBeCloseTo(block, 0);
      await expect(rowInput.height).toBeCloseTo(control, 0);
      await expect(centreY(rowInput)).toBeCloseTo(centreY(row), 0);

      const checkbox = byTestId(canvasElement, `checkbox-${size}`);
      const box = checkbox.querySelector('[data-part="control"]')?.getBoundingClientRect();
      await expect(box?.height).toBeCloseTo(icon, 0);
      await expect(box && centreY(box)).toBeCloseTo(centreY(checkbox.getBoundingClientRect()), 0);

      // In a Field stack the field pads its control out to a block.
      const fieldInput = byTestId(canvasElement, `field-input-${size}`);
      await expect(fieldInput.getBoundingClientRect().height).toBeCloseTo(control, 0);
      await expect(parseFloat(getComputedStyle(fieldInput).marginTop)).toBeCloseTo(inset, 0);
    }
  },
};

/** Roles come from the machines that implement them (decision 9). */
export const Roles: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByRole('toolbar')).toHaveLength(SIZES.length);
    await expect(canvas.getByRole('button', { name: 'Add md' })).toBeInTheDocument();
    await expect(canvas.getByRole('img', { name: 'Clear md' })).toBeInTheDocument();
    for (const icon of canvasElement.querySelectorAll('svg[data-scope="icon"]:not([aria-label])')) {
      await expect(icon.getAttribute('aria-hidden')).toBe('true');
    }
    // Decision 10: every themed part carries Ark's scope/part attributes.
    for (const part of canvasElement.querySelectorAll('[class*="nx-"]:not(.nx-scope)')) {
      await expect(part.hasAttribute('data-scope'), part.className).toBe(true);
    }

    const checkbox = canvas.getByRole('checkbox', { name: 'Subscribe md' });
    await expect(checkbox).toBeChecked();
    await userEvent.click(byTestId(canvasElement, 'checkbox-md'));
    await expect(checkbox).not.toBeChecked();

    const field = byTestId(canvasElement, 'field-md');
    await expect(canvas.getByRole('textbox', { name: 'Email md' })).toBe(byTestId(canvasElement, 'field-input-md'));
    await expect(field.dataset.scope).toBe('field');

    const trigger = canvas.getByRole('combobox', { name: 'Color md' });
    await userEvent.click(trigger);
    const body = within(canvasElement.ownerDocument.body);
    const listbox = await body.findByRole('listbox');
    await expect(listbox.dataset.surface).toBe('popup');
    await expect(getComputedStyle(listbox).getPropertyValue('--nx-level').trim()).toBe('5');
    await userEvent.click(body.getByRole('option', { name: 'Green' }));
    await waitFor(() => expect(trigger).toHaveTextContent('Green'));
  },
};

/** Arrow keys, Home and End rove across toolbar items; only one item is in the tab order. */
export const ToolbarFocus: Story = {
  play: async ({ canvasElement }) => {
    const add = byTestId(canvasElement, 'add-md');
    const remove = byTestId(canvasElement, 'remove-md');
    const save = byTestId(canvasElement, 'button-md');
    const select = byTestId(canvasElement, 'select-md');
    await waitFor(() => expect(add.tabIndex).toBe(0));
    await expect(remove.tabIndex).toBe(-1);

    add.focus();
    await userEvent.keyboard('{ArrowRight}');
    await expect(remove).toHaveFocus();
    await expect(remove.tabIndex).toBe(0);
    await expect(add.tabIndex).toBe(-1);
    await userEvent.keyboard('{ArrowRight}');
    await expect(save).toHaveFocus();
    await userEvent.keyboard('{End}');
    await expect(select).toHaveFocus();
    await userEvent.keyboard('{Home}');
    await expect(add).toHaveFocus();
    await userEvent.keyboard('{ArrowLeft}');
    await expect(select).toHaveFocus();
  },
};

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
    console.log(`[benchmark] ${ROWS.length} rows mounted and laid out in ${root?.getAttribute('data-render-ms')}ms`);
  },
};
