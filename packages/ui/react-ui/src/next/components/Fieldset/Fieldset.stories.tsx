//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, within } from 'storybook/test';

import { withTheme } from '../../../testing/index.ts';
import { Next } from '../../Next.tsx';
import { sizeRow } from '../../testing.ts';
import { SIZE_ARG_TYPES, type SizeArgs, withSizes } from '../../testing/stories.tsx';

/** Valid and enabled sets, then an invalid and a disabled one; test ids are scoped by the size row. */
const DefaultStory = () => (
  <>
    <Next.Fieldset.Root data-testid='profile'>
      <Next.Fieldset.Legend>
        Profile
        <Next.Block data-testid='profile-lock'>
          <Next.Icon icon='ph--user--regular' />
        </Next.Block>
      </Next.Fieldset.Legend>
      <Next.Field.Root data-testid='name'>
        <Next.Field.Header>
          <Next.Field.Label>Name</Next.Field.Label>
        </Next.Field.Header>
        <Next.Input placeholder='Ada Lovelace' />
      </Next.Field.Root>
      <Next.Field.Root data-testid='email'>
        <Next.Field.Header>
          <Next.Field.Label>Email</Next.Field.Label>
        </Next.Field.Header>
        <Next.Input type='email' placeholder='ada@example.com' />
      </Next.Field.Root>
      <Next.Fieldset.HelperText>Shown on your public page.</Next.Fieldset.HelperText>
      <Next.Fieldset.ErrorText>Complete your profile.</Next.Fieldset.ErrorText>
    </Next.Fieldset.Root>

    <Next.Fieldset.Root data-testid='notifications'>
      <Next.Fieldset.Legend>Notifications</Next.Fieldset.Legend>
      <Next.Switch label='Email digests' defaultChecked />
      <Next.Switch label='Mentions' />
      <Next.Switch label='Product updates' />
      <Next.Checkbox label='Email me a weekly digest' />
    </Next.Fieldset.Root>

    <Next.Fieldset.Root invalid>
      <Next.Fieldset.Legend>Account</Next.Fieldset.Legend>
      <Next.Field.Root>
        <Next.Field.Header>
          <Next.Field.Label>Handle</Next.Field.Label>
        </Next.Field.Header>
        <Next.Input />
      </Next.Field.Root>
      <Next.Field.Root>
        <Next.Field.Header>
          <Next.Field.Label>Recovery email</Next.Field.Label>
        </Next.Field.Header>
        <Next.Input type='email' />
      </Next.Field.Root>
      <Next.Fieldset.ErrorText>Complete your account.</Next.Fieldset.ErrorText>
    </Next.Fieldset.Root>

    <Next.Fieldset.Root disabled>
      <Next.Fieldset.Legend>Privacy</Next.Fieldset.Legend>
      <Next.Switch label='Show online status' />
      <Next.Switch label='Read receipts' />
      <Next.Checkbox label='Share usage data' />
    </Next.Fieldset.Root>

    <Next.Group justify='end'>
      <Next.Button>Cancel</Next.Button>
      <Next.Button type='submit' variant='primary'>
        Save
      </Next.Button>
    </Next.Group>
  </>
);

const meta = {
  title: 'ui/react-ui-core/next/components/Fieldset',
  render: DefaultStory,
  decorators: [withSizes(), withTheme()],
  args: { size: 'md' },
  argTypes: SIZE_ARG_TYPES,
  parameters: { layout: 'centered' },
} satisfies Meta<SizeArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

const bounds = (root: HTMLElement, selector: string) => {
  const element = root.querySelector<HTMLElement>(selector);
  if (!element) {
    throw new Error(`missing ${selector}`);
  }
  return element.getBoundingClientRect();
};

export const Default: Story = {};

/**
 * Sets are named groups whose legend row lines up with the fields' labels and controls; a disabled set disables every
 * control inside it, and an invalid set shows its error and marks its fields invalid.
 */
export const Test: Story = {
  args: { allSizes: true },
  play: async ({ canvasElement: canvasRoot }) => {
    const canvasElement = sizeRow(canvasRoot, 'md');
    const canvas = within(canvasElement);
    const profile = canvas.getByRole('group', { name: 'Profile' });
    await expect(profile.tagName).toBe('FIELDSET');
    await expect(profile).toHaveAttribute('data-scope', 'fieldset');
    await expect(profile).toHaveAccessibleDescription('Shown on your public page.');
    await expect(canvas.getByRole('group', { name: 'Notifications' })).toBeInTheDocument();
    await expect(getComputedStyle(profile).borderTopStyle).toBe('none');

    // The legend is an sm label row spanning the content track, like a Field's header.
    const legend = bounds(canvasElement, '[data-testid="profile"] legend');
    const label = bounds(canvasElement, '[data-testid="name"] label');
    const input = bounds(canvasElement, '[data-testid="name"] .nx-input');
    await expect(legend.height).toBeCloseTo(24, 0);
    await expect(legend.left).toBeCloseTo(label.left, 0);
    // The trailing Block is inset in a block-sized cell that ends at the control's edge.
    await expect(bounds(canvasElement, '[data-testid="profile-lock"]').right + 2).toBeCloseTo(input.right, 0);

    // Fields are spaced by the gap token; switches and the checkbox start on the legend's edge.
    const email = bounds(canvasElement, '[data-testid="email"]');
    const name = bounds(canvasElement, '[data-testid="name"]');
    await expect(email.top - name.bottom).toBeCloseTo(8, 0);
    // Switches and the checkbox each take an icon-only Button's block-sized cell on the legend's edge, so labels align.
    const notifications = bounds(canvasElement, '[data-testid="notifications"] legend');
    const controls = canvasElement.querySelectorAll<HTMLElement>(
      '[data-testid="notifications"] :is([data-scope="switch"], [data-scope="checkbox"])[data-part="control"]',
    );
    const labels = canvasElement.querySelectorAll<HTMLElement>(
      '[data-testid="notifications"] :is([data-scope="switch"], [data-scope="checkbox"])[data-part="label"]',
    );
    for (const control of controls) {
      const style = getComputedStyle(control);
      const rect = control.getBoundingClientRect();
      const cellLeft = rect.left - parseFloat(style.marginLeft);
      const cellWidth = rect.width + parseFloat(style.marginLeft) + parseFloat(style.marginRight);
      await expect(cellLeft).toBeCloseTo(notifications.left, 0);
      await expect(cellLeft).toBeCloseTo(legend.left, 0);
      await expect(cellWidth).toBeCloseTo(32, 0);
    }
    for (const label of labels) {
      await expect(label.getBoundingClientRect().left).toBeCloseTo(labels[0].getBoundingClientRect().left, 0);
    }
    await expect(canvas.queryByText('Complete your profile.')).toBeNull();
    await expect(canvas.getByRole('group', { name: 'Profile' })).not.toHaveAttribute('data-invalid');
    await expect(canvas.getByRole('group', { name: 'Notifications' })).toBeEnabled();

    await expect(canvas.getByRole('group', { name: 'Privacy' })).toBeDisabled();
    for (const name of ['Show online status', 'Read receipts']) {
      await expect(canvas.getByRole('switch', { name })).toBeDisabled();
    }
    await expect(canvas.getByRole('checkbox', { name: 'Share usage data' })).toBeDisabled();
    await expect(canvas.getByRole('textbox', { name: 'Name' })).toBeEnabled();

    await expect(canvas.getByText('Complete your account.')).toBeVisible();
    await expect(canvas.getByRole('group', { name: 'Account' })).toHaveAttribute('data-invalid');
    for (const name of ['Handle', 'Recovery email']) {
      await expect(canvas.getByRole('textbox', { name })).toHaveAttribute('aria-invalid', 'true');
    }
  },
};
