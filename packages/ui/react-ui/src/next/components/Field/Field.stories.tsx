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
import { type SizeArgs, withSizes } from '../../stories.tsx';
import { GEOMETRY, byTestId, controlSize, expectScoped, expectTooltip, sizeRow } from '../../testing.ts';

/** A labelled field with helper text, then the same header-with-action field valid and invalid. */
const DefaultStory = ({ size }: SizeArgs) => (
  <>
    <Next.Field.Root data-testid={`field-${size}`}>
      <Next.Field.Label>Email {size}</Next.Field.Label>
      <Next.Input data-testid={`field-input-${size}`} />
      <Next.Field.HelperText>We never share it.</Next.Field.HelperText>
    </Next.Field.Root>
    {(['Website', 'Homepage'] as const).map((name) => (
      <Next.Field.Root key={name} invalid={name === 'Homepage'} data-testid={`${name.toLowerCase()}-${size}`}>
        <Next.Field.Header>
          <Next.Field.Label>{name}</Next.Field.Label>
          <Next.Button icon='ph--x--regular' label={`Clear ${name.toLowerCase()}`} iconOnly />
        </Next.Field.Header>
        <Next.Input defaultValue='not a url' />
        <Next.Field.ErrorText>Enter a valid URL.</Next.Field.ErrorText>
      </Next.Field.Root>
    ))}
  </>
);

const meta = {
  title: 'ui/react-ui-core/next/components/field',
  render: DefaultStory,
  decorators: [withSizes(), withTheme()],
  parameters: { layout: 'centered' },
} satisfies Meta<SizeArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * In a Field stack the field pads its control out to a block (finding 11); the field wires its label and helper text
 * to the control, and ErrorText renders only while invalid; a trailing icon-only Button in `Field.Header` shows its
 * label in a Tooltip (left open).
 */
export const Test: Story = {
  play: async ({ canvasElement }) => {
    for (const size of SIZES) {
      const input = byTestId(canvasElement, `field-input-${size}`);
      await expect(input.getBoundingClientRect().height, size).toBeCloseTo(controlSize(size), 0);
      await expect(parseFloat(getComputedStyle(input).marginTop), size).toBeCloseTo(GEOMETRY[size].inset, 0);
      await expect(parseFloat(getComputedStyle(input).marginBottom), size).toBeCloseTo(GEOMETRY[size].inset, 0);
    }

    const canvas = within(sizeRow(canvasElement, 'md'));
    const input = canvas.getByRole('textbox', { name: 'Email md' });
    await expect(input).toBe(byTestId(canvasElement, 'field-input-md'));
    await expect(input).toHaveAccessibleDescription('We never share it.');
    await expect(byTestId(canvasElement, 'field-md').dataset.scope).toBe('field');
    const website = within(byTestId(canvasElement, 'website-md'));
    await expect(website.queryByText('Enter a valid URL.')).toBeNull();
    await expect(website.getByRole('textbox', { name: 'Website' })).not.toHaveAttribute('aria-invalid', 'true');
    await expectScoped(canvasElement);

    const homepage = within(byTestId(canvasElement, 'homepage-md'));
    await expect(homepage.getByText('Enter a valid URL.')).toBeVisible();
    await expect(homepage.getByRole('textbox', { name: 'Homepage' })).toHaveAttribute('aria-invalid', 'true');
    await expect(byTestId(canvasElement, 'homepage-md')).toHaveAttribute('data-invalid');

    const clear = website.getByRole('button', { name: 'Clear website' });
    await userEvent.hover(clear);
    await expectTooltip(clear, 'Clear website');
  },
};
