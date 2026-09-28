//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { withTheme } from '../../../testing/index.ts';
import { Next } from '../../Next.tsx';
import { SIZES } from '../../sizes.ts';
import { SIZE_ARG_TYPES, type SizeArgs, withSizes } from '../../stories.tsx';
import { GEOMETRY, byTestId, centreY, controlSize, expectScoped } from '../../testing.ts';

/** A toolbar of plain inputs, then inputs with a leading icon, a trailing unit, a trailing button, and `subdued`. */
const DefaultStory = ({ size }: SizeArgs) => (
  <>
    <Next.Toolbar.Root data-testid={`toolbar-${size}`}>
      <Next.Input placeholder='Search' aria-label={`Search ${size}`} noAutoFill data-testid={`input-${size}`} />
      <Next.Input placeholder='Disabled' aria-label={`Disabled ${size}`} disabled />
    </Next.Toolbar.Root>
    <Next.Input
      start={<Next.Icon icon='ph--magnifying-glass--regular' />}
      placeholder='Find…'
      aria-label={`Find ${size}`}
      data-testid={`start-${size}`}
    />
    <Next.Input end='.dxos.org' placeholder='workspace' aria-label={`Workspace ${size}`} data-testid={`end-${size}`} />
    <Next.Input
      end={<Next.Button icon='ph--x--regular' label={`Clear ${size}`} iconOnly variant='ghost' />}
      defaultValue='Query'
      aria-label={`Query ${size}`}
      data-testid={`button-end-${size}`}
    />
    <Next.Input
      variant='subdued'
      placeholder='Subdued'
      aria-label={`Subdued ${size}`}
      data-testid={`subdued-${size}`}
    />
  </>
);

const meta = {
  title: 'ui/react-ui-core/next/components/Input',
  render: DefaultStory,
  decorators: [withSizes(), withTheme()],
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
      const toolbar = byTestId(canvasElement, `toolbar-${size}`).getBoundingClientRect();
      const rect = byTestId(canvasElement, `input-${size}`).getBoundingClientRect();
      await expect(rect.height, `input-${size} height`).toBeCloseTo(controlSize(size), 0);
      await expect(centreY(rect), `input-${size} centre`).toBeCloseTo(centreY(toolbar), 0);
    }

    const canvas = within(canvasElement);
    const input = canvas.getByRole('textbox', { name: 'Search md' });
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
      await expect(row.right - clear.right, `clear-${size} end`).toBeCloseTo(GEOMETRY[size].inset, 0);
    }
    const find = canvas.getByRole('textbox', { name: 'Find md' });
    const findRow = byTestId(canvasElement, 'start-md');
    await expect(find).not.toBe(findRow);
    await expect(findRow.querySelector('svg')?.getBoundingClientRect().right).toBeLessThan(
      find.getBoundingClientRect().left,
    );
    await expect(
      within(byTestId(canvasElement, 'end-md')).getByText('.dxos.org').getBoundingClientRect().left,
    ).toBeGreaterThan(canvas.getByRole('textbox', { name: 'Workspace md' }).getBoundingClientRect().right - 1);
    await userEvent.click(find);
    await userEvent.tab({ shift: true });
    await userEvent.tab();
    await expect(find).toHaveFocus();
    await expect(getComputedStyle(findRow).outlineStyle).toBe('solid');
    await userEvent.type(find, 'abc');
    await expect(find).toHaveValue('abc');
    await expect(getComputedStyle(byTestId(canvasElement, 'subdued-md')).backgroundColor).toBe('rgba(0, 0, 0, 0)');

    const disabled = canvas.getByRole('textbox', { name: 'Disabled md' });
    await expect(disabled).toBeDisabled();
    await userEvent.type(disabled, 'hello');
    await expect(disabled).toHaveValue('');
  },
};
