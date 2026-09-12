//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, within } from 'storybook/test';

import { withLayout, withTheme } from '../../testing';
import { Field } from '../Field';
import { Fieldset } from './Fieldset.tsx';

type StoryArgs = {
  disabled?: boolean;
  invalid?: boolean;
};

/** Two fields under one legend; the fieldset's state reaches both, and its texts describe the group. */
const DefaultStory = ({ disabled, invalid }: StoryArgs) => (
  <Fieldset.Root disabled={disabled} invalid={invalid} classNames='flex flex-col'>
    <Fieldset.Legend>Shipping address</Fieldset.Legend>
    <Fieldset.HelperText>Where the order is sent.</Fieldset.HelperText>
    <Field.Root>
      <Field.Label>Street</Field.Label>
      <Field.Input placeholder='1 Main St' />
    </Field.Root>
    <Field.Root>
      <Field.Label>City</Field.Label>
      <Field.Input placeholder='Springfield' />
    </Field.Root>
    <Fieldset.ErrorText>The address could not be verified.</Fieldset.ErrorText>
  </Fieldset.Root>
);

const meta = {
  title: 'ui/react-ui-core/components/Fieldset',
  component: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: { layout: 'fullscreen' },
  args: { disabled: false, invalid: false },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const group = canvas.getByRole('group', { name: 'Shipping address' });
    await expect(group).toHaveAccessibleDescription('Where the order is sent.');
    await expect(canvas.getByLabelText('Street')).toBeEnabled();
    await expect(canvas.queryByText('The address could not be verified.')).toBeNull();
  },
};

export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByLabelText('Street')).toBeDisabled();
    await expect(canvas.getByLabelText('City')).toBeDisabled();
  },
};

export const Invalid: Story = {
  args: { invalid: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const group = canvas.getByRole('group', { name: 'Shipping address' });
    await expect(group).toHaveAttribute('data-invalid');
    await expect(group).toHaveAccessibleDescription('The address could not be verified. Where the order is sent.');
  },
};
