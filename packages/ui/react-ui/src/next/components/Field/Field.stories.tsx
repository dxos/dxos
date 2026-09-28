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

const VALENCES: Next.FieldValence[] = ['success', 'info', 'warning', 'error'];

/**
 * A labelled field with helper text, the same header-with-action field valid and invalid, a field per validation
 * valence, and one with a visually hidden label.
 */
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
    {VALENCES.map((valence) => (
      <Next.Field.Root key={valence} validationValence={valence} data-testid={`${valence}-${size}`}>
        <Next.Field.Label>Handle ({valence})</Next.Field.Label>
        <Next.Input defaultValue='dxos' data-testid={`${valence}-input-${size}`} />
        <Next.Field.HelperText data-testid={`${valence}-helper-${size}`}>A {valence} message.</Next.Field.HelperText>
        <Next.Field.ErrorText>The handle is taken.</Next.Field.ErrorText>
      </Next.Field.Root>
    ))}
    <Next.Field.Root>
      <Next.Field.Label srOnly data-testid={`hidden-label-${size}`}>
        Filter {size}
      </Next.Field.Label>
      <Next.Input placeholder='Filter' />
    </Next.Field.Root>
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
 * label in a Tooltip (left open). `validationValence` gives the control a 1px border and focus ring in the valence's
 * border colour and the HelperText its text colour; `error` also makes the field invalid. An `srOnly` label still
 * names its control.
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

    const plainHelper = getComputedStyle(
      within(byTestId(canvasElement, 'field-md')).getByText('We never share it.'),
    ).color;
    const tones = new Set<string>();
    for (const valence of VALENCES) {
      const input = byTestId(canvasElement, `${valence}-input-md`);
      await expect(getComputedStyle(input).boxShadow, valence).toMatch(/0px 0px 0px 1px inset$/);
      const helper = getComputedStyle(byTestId(canvasElement, `${valence}-helper-md`)).color;
      await expect(helper, valence).not.toBe(plainHelper);
      tones.add(helper);
      const errorText = within(byTestId(canvasElement, `${valence}-md`)).queryByText('The handle is taken.');
      if (valence === 'error') {
        await expect(input).toHaveAttribute('aria-invalid', 'true');
        await expect(errorText).toBeVisible();
      } else {
        await expect(input).not.toHaveAttribute('aria-invalid', 'true');
        await expect(errorText).toBeNull();
      }
    }
    await expect(tones.size).toBe(VALENCES.length);
    await expect(canvas.getByRole('textbox', { name: 'Filter md' })).toBeInTheDocument();
    await expect(byTestId(canvasElement, 'hidden-label-md').getBoundingClientRect().width).toBeLessThanOrEqual(1);

    const clear = website.getByRole('button', { name: 'Clear website' });
    await userEvent.hover(clear);
    await expectTooltip(clear, 'Clear website');
  },
};
