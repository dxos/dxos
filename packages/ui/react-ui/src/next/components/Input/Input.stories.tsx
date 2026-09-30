//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { withLayout, withTheme } from '../../../testing/index.ts';
import { Next } from '../../Next.tsx';
import { SIZES } from '../../sizes.ts';
import { GEOMETRY, byTestId, controlSize, expectEndCell, expectScoped, sizeRow } from '../../testing.ts';
import { SIZE_ARG_TYPES, type SizeArgs, withSizes } from '../../testing/stories.tsx';

/** Plain inputs, then inputs with a leading icon, a trailing unit, a trailing button, and `subdued`. */
const DefaultStory = ({ size }: SizeArgs) => (
  <>
    <Next.Input placeholder='Search' aria-label='Search' noAutoFill data-testid={`input-${size}`} />
    <Next.Input placeholder='Disabled' aria-label='Disabled' disabled />
    <Next.Input
      start={<Next.Icon icon='ph--magnifying-glass--regular' />}
      placeholder='Find…'
      aria-label='Find'
      data-testid={`start-${size}`}
    />
    <Next.Input end='.dxos.org' placeholder='workspace' aria-label='Workspace' data-testid={`end-${size}`} />
    <Next.Input
      end={<Next.Button icon='ph--x--regular' label='Clear' iconOnly variant='ghost' />}
      defaultValue='Query'
      aria-label='Query'
      data-testid={`button-end-${size}`}
    />
    <Next.Input variant='subdued' placeholder='Subdued' aria-label='Subdued' data-testid={`subdued-${size}`} />
  </>
);

const meta = {
  title: 'ui/react-ui-core/next/components/Input',
  render: DefaultStory,
  decorators: [withSizes(), withLayout({ classNames: 'p-0 w-[32rem]' }), withTheme()],
  args: { size: 'md' },
  argTypes: SIZE_ARG_TYPES,
  parameters: { layout: 'centered' },
} satisfies Meta<SizeArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * Inputs are control-tall and centred in their block at every size (decision 12); a text input is named by its
 * `aria-label` and takes typed text, unless disabled. `noAutoFill` asks password managers to stay away. With `start` or
 * `end` the control is a row holding the adornments and a bare input, still control-tall, whose ring follows the
 * input's focus; a trailing icon-only Button fits inside the row. `subdued` drops the well.
 */
export const Test: Story = {
  args: { allSizes: true },
  play: async ({ canvasElement }) => {
    for (const size of SIZES) {
      const input = byTestId(canvasElement, `input-${size}`);
      const rect = input.getBoundingClientRect();
      await expect(rect.height, `input-${size} height`).toBeCloseTo(controlSize(size), 0);
      // The stack pads the control out to a block by one inset above and below, so it is centred in its block.
      const style = getComputedStyle(input);
      await expect(parseFloat(style.marginTop), `input-${size} inset`).toBeCloseTo(GEOMETRY[size].inset, 0);
      await expect(parseFloat(style.marginBottom), `input-${size} inset`).toBeCloseTo(GEOMETRY[size].inset, 0);
    }

    const canvas = within(sizeRow(canvasElement, 'md'));
    const input = canvas.getByRole('textbox', { name: 'Search' });
    await expect(input).toHaveAttribute('type', 'text');
    await userEvent.type(input, 'hello');
    await expect(input).toHaveValue('hello');
    await expectScoped(canvasElement);

    await expect(input).toHaveAttribute('data-1p-ignore');

    for (const size of SIZES) {
      for (const part of ['start', 'end', 'button-end']) {
        const rect = byTestId(canvasElement, `${part}-${size}`).getBoundingClientRect();
        await expect(rect.height, `${part}-${size} height`).toBeCloseTo(controlSize(size), 0);
      }
      const row = byTestId(canvasElement, `button-end-${size}`).getBoundingClientRect();
      const clear = within(byTestId(canvasElement, `button-end-${size}`))
        .getByRole('button')
        .getBoundingClientRect();
      await expect(clear.top, `clear-${size} top`).toBeGreaterThanOrEqual(row.top);
      await expect(clear.bottom, `clear-${size} bottom`).toBeLessThanOrEqual(row.bottom);
      await expectEndCell(
        within(byTestId(canvasElement, `button-end-${size}`))
          .getByRole('button')
          .querySelector('svg'),
        row.right,
        size,
        `clear-${size}`,
      );
    }
    const find = canvas.getByRole('textbox', { name: 'Find' });
    const findRow = byTestId(canvasElement, 'start-md');
    await expect(find).not.toBe(findRow);
    await expect(findRow.querySelector('svg')?.getBoundingClientRect().right).toBeLessThan(
      find.getBoundingClientRect().left,
    );
    await expect(
      within(byTestId(canvasElement, 'end-md')).getByText('.dxos.org').getBoundingClientRect().left,
    ).toBeGreaterThan(canvas.getByRole('textbox', { name: 'Workspace' }).getBoundingClientRect().right - 1);
    await userEvent.click(find);
    await userEvent.tab({ shift: true });
    await userEvent.tab();
    await expect(find).toHaveFocus();
    await expect(getComputedStyle(findRow).outlineStyle).toBe('solid');
    await userEvent.type(find, 'abc');
    await expect(find).toHaveValue('abc');
    await expect(getComputedStyle(byTestId(canvasElement, 'subdued-md')).backgroundColor).toBe('rgba(0, 0, 0, 0)');

    const disabled = canvas.getByRole('textbox', { name: 'Disabled' });
    await expect(disabled).toBeDisabled();
    await userEvent.type(disabled, 'hello');
    await expect(disabled).toHaveValue('');
  },
};
