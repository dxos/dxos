//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { expect, waitFor, within } from 'storybook/test';

import { withLayout, withTheme } from '../../../testing/index.ts';
import { SIZES } from '../../sizes.ts';
import { GEOMETRY, byTestId, controlSize, expectScoped, sizeRow } from '../../testing.ts';
import { SIZE_ARG_TYPES, type SizeArgs, withSizes } from '../../testing/stories.tsx';
import { Field, PinInput } from '../index.ts';

/** Types with the runner's real keyboard, so zag's `beforeinput` validation (numeric cells) sees trusted input. */
const realType = async (text: string) => {
  const { userEvent: keyboard } = await import('vitest/browser');
  await keyboard.keyboard(text);
};

const DefaultStory = ({ size }: SizeArgs) => {
  const [value, setValue] = useState('');
  const [complete, setComplete] = useState('');
  return (
    <>
      <Field.Root>
        <Field.Label>Code</Field.Label>
        <PinInput
          otp
          value={value}
          onValueChange={setValue}
          onValueComplete={setComplete}
          data-testid={`pin-${size}`}
        />
        <Field.HelperText>
          Value: <output data-testid={`pin-${size}-value`}>{value}</output>, complete:{' '}
          <output data-testid={`pin-${size}-complete`}>{complete}</output>
        </Field.HelperText>
      </Field.Root>
      <Field.Root>
        <Field.Label>PIN</Field.Label>
        <PinInput length={4} mask defaultValue='12' data-testid={`masked-${size}`} />
      </Field.Root>
      <Field.Root invalid>
        <Field.Label>Expired</Field.Label>
        <PinInput length={4} type='alphanumeric' defaultValue='AB12' data-testid={`invalid-${size}`} />
        <Field.ErrorText>The code has expired.</Field.ErrorText>
      </Field.Root>
      <Field.Root disabled>
        <Field.Label>Locked</Field.Label>
        <PinInput length={4} data-testid={`disabled-${size}`} />
      </Field.Root>
    </>
  );
};

const meta = {
  title: 'ui/react-ui-core/components/PinInput',
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
 * Every cell is a control-sized square at every size, inset in the field like any control; the Field label names the
 * cells' group and its description describes it. Typing fills cell by cell and completes the code; `mask` hides the
 * characters; invalid and disabled reach every cell.
 */
export const Test: Story = {
  args: { allSizes: true },
  play: async ({ canvasElement }) => {
    for (const size of SIZES) {
      const group = byTestId(canvasElement, `pin-${size}`);
      await expect(parseFloat(getComputedStyle(group).marginTop), `${size} inset`).toBeCloseTo(GEOMETRY[size].inset, 0);
      const cells = within(group).getAllByRole('textbox');
      await expect(cells).toHaveLength(6);
      for (const cell of cells) {
        const rect = cell.getBoundingClientRect();
        await expect(rect.height, `${size} cell height`).toBeCloseTo(controlSize(size), 0);
        await expect(rect.width, `${size} cell width`).toBeCloseTo(controlSize(size), 0);
        await expect(Math.abs(rect.top - cells[0].getBoundingClientRect().top), `${size} one row`).toBeLessThan(1);
      }
    }
    await expectScoped(canvasElement);

    const md = sizeRow(canvasElement, 'md');
    const canvas = within(md);
    const group = canvas.getByRole('group', { name: 'Code' });
    await expect(group).toHaveAccessibleDescription(/Value:/);
    const cells = within(group).getAllByRole('textbox');
    await expect(cells[0]).toHaveAttribute('autocomplete', 'one-time-code');

    const { userEvent: real } = await import('vitest/browser');
    // Clicking the Field label focuses the first cell, not the hidden input the label points at.
    await real.click(canvas.getByText('Code', { selector: 'label' }));
    await expect(cells[0]).toHaveFocus();
    await realType('12345');
    await waitFor(() => expect(byTestId(md, 'pin-md-value')).toHaveTextContent('12345'));
    await expect(cells[5]).toHaveFocus();
    await expect(byTestId(md, 'pin-md-complete')).toHaveTextContent('');
    await realType('6');
    await waitFor(() => expect(byTestId(md, 'pin-md-complete')).toHaveTextContent('123456'));
    // Numeric cells reject letters.
    await realType('{Backspace}x');
    await waitFor(() => expect(byTestId(md, 'pin-md-value')).toHaveTextContent('12345'));

    const masked = byTestId(md, 'masked-md').querySelectorAll('input');
    await expect(masked).toHaveLength(4);
    for (const cell of masked) {
      await expect(cell).toHaveAttribute('type', 'password');
    }
    await expect(masked[0]).toHaveValue('1');

    for (const cell of within(byTestId(md, 'invalid-md')).getAllByRole('textbox')) {
      await expect(cell).toHaveAttribute('aria-invalid', 'true');
    }
    await expect(canvas.getByText('The code has expired.')).toBeVisible();
    for (const cell of within(byTestId(md, 'disabled-md')).getAllByRole('textbox')) {
      await expect(cell).toBeDisabled();
    }
  },
};
