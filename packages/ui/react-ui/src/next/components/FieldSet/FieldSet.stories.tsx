//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, within } from 'storybook/test';

import { withTheme } from '../../../testing/index.ts';
import { Next } from '../../Next.tsx';

type StoryArgs = {
  /** Disables the Notifications set. */
  disabled?: boolean;
  /** Marks the Profile set invalid. */
  invalid?: boolean;
};

const DefaultStory = ({ disabled, invalid }: StoryArgs) => (
  <div className='nx-scope @container w-[30rem] border border-separator' data-size='md'>
    <Next.Container gutter='rail' level='base'>
      <Next.FieldSet.Root invalid={invalid} data-testid='profile'>
        <Next.FieldSet.Legend>
          Profile
          <Next.Block data-testid='profile-lock'>
            <Next.Icon icon='ph--user--regular' />
          </Next.Block>
        </Next.FieldSet.Legend>
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
        <Next.FieldSet.HelperText>Shown on your public page.</Next.FieldSet.HelperText>
        <Next.FieldSet.ErrorText>Complete your profile.</Next.FieldSet.ErrorText>
      </Next.FieldSet.Root>

      <Next.FieldSet.Root disabled={disabled} data-testid='notifications'>
        <Next.FieldSet.Legend>Notifications</Next.FieldSet.Legend>
        <Next.Switch label='Email digests' defaultChecked />
        <Next.Switch label='Mentions' />
        <Next.Switch label='Product updates' />
        <Next.Checkbox label='Email me a weekly digest' />
      </Next.FieldSet.Root>

      <Next.Group justify='end'>
        <Next.Button>Cancel</Next.Button>
        <Next.Button type='submit' variant='primary'>
          Save
        </Next.Button>
      </Next.Group>
    </Next.Container>
  </div>
);

const meta = {
  title: 'ui/react-ui-core/next/components/fieldset',
  render: DefaultStory,
  decorators: [withTheme()],
  parameters: { layout: 'centered' },
} satisfies Meta<StoryArgs>;

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

/** Sets are named groups whose legend row lines up with the fields' labels and controls. */
export const Layout: Story = {
  play: async ({ canvasElement }) => {
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
    // Switches and the checkbox each take an IconButton's block-sized cell on the legend's edge, so labels align.
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
  },
};

/** A disabled set disables every control inside it. */
export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('group', { name: 'Notifications' })).toBeDisabled();
    for (const name of ['Email digests', 'Mentions', 'Product updates']) {
      await expect(canvas.getByRole('switch', { name })).toBeDisabled();
    }
    await expect(canvas.getByRole('checkbox', { name: 'Email me a weekly digest' })).toBeDisabled();
    await expect(canvas.getByRole('textbox', { name: 'Name' })).toBeEnabled();
  },
};

/** An invalid set shows its error and marks its fields invalid. */
export const Invalid: Story = {
  args: { invalid: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Complete your profile.')).toBeVisible();
    await expect(canvas.getByRole('group', { name: 'Profile' })).toHaveAttribute('data-invalid');
    for (const name of ['Name', 'Email']) {
      await expect(canvas.getByRole('textbox', { name })).toHaveAttribute('aria-invalid', 'true');
    }
  },
};
