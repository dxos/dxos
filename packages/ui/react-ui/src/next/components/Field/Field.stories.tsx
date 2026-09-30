//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { translations } from '#translations';

import { withTheme } from '../../../testing/index.ts';
import { Next } from '../../Next.tsx';
import { SIZES } from '../../sizes.ts';
import { GEOMETRY, byTestId, controlSize, expectScoped, expectTooltip, sizeRow } from '../../testing.ts';
import { SIZE_ARG_TYPES, type SizeArgs, withSizes } from '../../testing/stories.tsx';

const VALENCES: Next.FieldValence[] = ['success', 'info', 'warning', 'error'];

/**
 * Every current `Field` part as a Next field (DESIGN.md follow-up 54): text, textarea, the segmented date, time and
 * date-time with the calendar trigger, PIN, number, password, and a checkbox and switch in block cells (the current
 * `Field.Block`). A `required` field (its label marked automatically, then with the mark placed by hand), a `readOnly`
 * one and an `asChild` root close it.
 */
const EveryField = ({ size }: SizeArgs) => (
  <>
    <Next.Field.Root>
      <Next.Field.Label>Name</Next.Field.Label>
      <Next.Input data-testid={`every-input-${size}`} />
    </Next.Field.Root>
    <Next.Field.Root>
      <Next.Field.Label>Bio</Next.Field.Label>
      <Next.Textarea />
    </Next.Field.Root>
    <Next.Field.Root>
      <Next.Field.Label>Birthday</Next.Field.Label>
      <Next.DateInput defaultValue='1990-04-01' data-testid={`every-date-${size}`} />
    </Next.Field.Root>
    <Next.Field.Root>
      <Next.Field.Label>Wake up</Next.Field.Label>
      <Next.DateInput type='time' defaultValue='07:00' data-testid={`every-time-${size}`} />
    </Next.Field.Root>
    <Next.Field.Root>
      <Next.Field.Label>Meeting</Next.Field.Label>
      <Next.DateInput type='datetime-local' defaultValue='2026-09-29T14:00' />
    </Next.Field.Root>
    <Next.Field.Root>
      <Next.Field.Label>Code</Next.Field.Label>
      <Next.PinInput length={4} data-testid={`every-pin-${size}`} />
    </Next.Field.Root>
    <Next.Field.Root>
      <Next.Field.Label>Age</Next.Field.Label>
      <Next.NumberInput min={0} defaultValue='30' data-testid={`every-number-${size}`} />
    </Next.Field.Root>
    <Next.Field.Root>
      <Next.Field.Label>Password</Next.Field.Label>
      <Next.PasswordInput data-testid={`every-password-${size}`} />
    </Next.Field.Root>
    <Next.Field.Root>
      <Next.Checkbox label='Subscribe' data-testid={`every-checkbox-${size}`} />
    </Next.Field.Root>
    <Next.Field.Root>
      <Next.Switch label='Notifications' data-testid={`every-switch-${size}`} />
    </Next.Field.Root>
    <Next.Field.Root required>
      <Next.Field.Label data-testid={`required-label-${size}`}>Handle</Next.Field.Label>
      <Next.Input />
    </Next.Field.Root>
    <Next.Field.Root required>
      <Next.Field.Label data-testid={`placed-label-${size}`}>
        <Next.Field.RequiredIndicator>required</Next.Field.RequiredIndicator> Alias
      </Next.Field.Label>
      <Next.Input />
    </Next.Field.Root>
    <Next.Field.Root readOnly>
      <Next.Field.Label>Id</Next.Field.Label>
      <Next.Input defaultValue='abc-123' />
    </Next.Field.Root>
    <Next.Field.Root asChild data-testid={`every-as-child-${size}`}>
      <section>
        <Next.Field.Label>Nickname</Next.Field.Label>
        <Next.Input />
      </section>
    </Next.Field.Root>
  </>
);

/**
 * A labelled field with helper text, the same header-with-action field valid and invalid, a field per validation
 * valence, one with a visually hidden label, then every field type.
 */
const DefaultStory = ({ size }: SizeArgs) => (
  <>
    <Next.Field.Root data-testid={`field-${size}`}>
      <Next.Field.Label>Email</Next.Field.Label>
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
        Filter
      </Next.Field.Label>
      <Next.Input placeholder='Filter' />
    </Next.Field.Root>
    <EveryField size={size} />
  </>
);

const meta = {
  title: 'ui/react-ui-core/next/components/Field',
  render: DefaultStory,
  decorators: [withSizes(), withTheme()],
  args: { size: 'md' },
  argTypes: SIZE_ARG_TYPES,
  parameters: { layout: 'centered', translations },
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
  args: { allSizes: true },
  play: async ({ canvasElement }) => {
    for (const size of SIZES) {
      const input = byTestId(canvasElement, `field-input-${size}`);
      await expect(input.getBoundingClientRect().height, size).toBeCloseTo(controlSize(size), 0);
      await expect(parseFloat(getComputedStyle(input).marginTop), size).toBeCloseTo(GEOMETRY[size].inset, 0);
      await expect(parseFloat(getComputedStyle(input).marginBottom), size).toBeCloseTo(GEOMETRY[size].inset, 0);
    }

    const canvas = within(sizeRow(canvasElement, 'md'));
    const input = canvas.getByRole('textbox', { name: 'Email' });
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
    await expect(canvas.getByRole('textbox', { name: 'Filter' })).toBeInTheDocument();
    await expect(byTestId(canvasElement, 'hidden-label-md').getBoundingClientRect().width).toBeLessThanOrEqual(1);

    // Every field type is named by its Field label; a checkbox or switch takes a block like the current `Field.Block`.
    for (const size of SIZES) {
      for (const part of ['input', 'date', 'time', 'number', 'password']) {
        const control = byTestId(canvasElement, `every-${part}-${size}`);
        await expect(control.getBoundingClientRect().height, `${part} ${size}`).toBeCloseTo(controlSize(size), 0);
      }
      for (const part of ['checkbox', 'switch']) {
        const control = byTestId(canvasElement, `every-${part}-${size}`);
        await expect(control.getBoundingClientRect().height, `${part} ${size}`).toBeCloseTo(GEOMETRY[size].block, 0);
      }
    }
    await expect(canvas.getByRole('textbox', { name: 'Name' })).toBeInTheDocument();
    await expect(canvas.getByRole('textbox', { name: 'Bio' }).tagName).toBe('TEXTAREA');
    await expect(canvas.getByRole('group', { name: 'Birthday' })).toBeInTheDocument();
    await expect(
      within(byTestId(canvasElement, 'every-date-md')).getByRole('button', { name: 'Pick a date' }),
    ).toBeVisible();
    await expect(canvas.getByRole('group', { name: 'Wake up' })).toBeInTheDocument();
    await expect(canvas.getByRole('group', { name: 'Meeting' })).toBeInTheDocument();
    await expect(within(canvas.getByRole('group', { name: 'Code' })).getAllByRole('textbox')).toHaveLength(4);
    await expect(canvas.getByRole('spinbutton', { name: 'Age' })).toHaveValue('30');
    await expect(canvas.getByLabelText('Password')).toHaveAttribute('type', 'password');
    await expect(canvas.getByRole('checkbox', { name: 'Subscribe' })).toBeInTheDocument();
    await expect(canvas.getByRole('switch', { name: 'Notifications' })).toBeInTheDocument();
    await expect(canvas.getByRole('textbox', { name: 'Handle' })).toBeRequired();
    // A required root's label ends with Ark's mark on its own, kept out of the name; one placed in the label replaces it.
    const marks = byTestId(canvasElement, 'required-label-md').querySelectorAll('[data-part="required-indicator"]');
    await expect(marks).toHaveLength(1);
    await expect(marks[0]).toHaveTextContent('*');
    await expect(marks[0]).toHaveAttribute('aria-hidden', 'true');
    await expect(
      canvas
        .getByRole('textbox', { name: 'Id' })
        .closest('.nx-field')
        ?.querySelector('[data-part="required-indicator"]'),
    ).toBeNull();
    const placed = byTestId(canvasElement, 'placed-label-md').querySelectorAll('[data-part="required-indicator"]');
    await expect(placed).toHaveLength(1);
    await expect(placed[0]).toHaveTextContent('required');
    await expect(canvas.getByRole('textbox', { name: 'Alias' })).toBeRequired();
    await expect(canvas.getByRole('textbox', { name: 'Id' })).toHaveAttribute('readonly');
    const asChild = byTestId(canvasElement, 'every-as-child-md');
    await expect(asChild.tagName).toBe('SECTION');
    await expect(asChild).toHaveClass('nx-field');
    await expect(within(asChild).getByRole('textbox', { name: 'Nickname' })).toBeInTheDocument();

    const clear = website.getByRole('button', { name: 'Clear website' });
    await userEvent.hover(clear);
    await expectTooltip(clear, 'Clear website');
  },
};
