//
// Copyright 2026 DXOS.org
//

import './theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, within } from 'storybook/test';

import { withTheme } from '../testing/index.ts';
import { Next } from './components.tsx';

const ROLES: Next.SelectOption[] = [
  { value: 'owner', label: 'Owner' },
  { value: 'editor', label: 'Editor' },
  { value: 'viewer', label: 'Viewer' },
];

/** A basic form: each Field stacks its label above the control (decision 13). */
const DefaultStory = () => (
  <div className='nx-scope @container w-[30rem] border border-separator' data-size='md'>
    <Next.Container gutter='rail'>
      <Next.Field.Root data-testid='name'>
        <Next.Field.Label>Name</Next.Field.Label>
        <Next.Input placeholder='Ada Lovelace' />
      </Next.Field.Root>

      <Next.Field.Root data-testid='email'>
        <Next.Field.Label>Email</Next.Field.Label>
        <Next.Input type='email' placeholder='ada@example.com' />
        <Next.Field.HelperText>We never share your address.</Next.Field.HelperText>
      </Next.Field.Root>

      <Next.Field.Root data-testid='role'>
        <Next.Select.Root items={ROLES} positioning={{ sameWidth: true }}>
          <Next.Select.Label>Role</Next.Select.Label>
          <Next.Select.Trigger placeholder='Select a role' />
          <Next.Select.Content>
            {ROLES.map((item) => (
              <Next.Select.Item key={item.value} item={item} />
            ))}
          </Next.Select.Content>
        </Next.Select.Root>
      </Next.Field.Root>

      <Next.Field.Root invalid data-testid='website'>
        <Next.Field.Label>Website</Next.Field.Label>
        <Next.Input defaultValue='not a url' />
        <Next.Field.ErrorText>Enter a valid URL.</Next.Field.ErrorText>
      </Next.Field.Root>

      <Next.Field.Root data-testid='subscribe'>
        <Next.Checkbox label='Subscribe to updates' />
      </Next.Field.Root>

      <Next.Toolbar data-testid='actions'>
        <Next.Button>Cancel</Next.Button>
        <Next.Button type='submit'>Save</Next.Button>
      </Next.Toolbar>
    </Next.Container>
  </div>
);

const meta = {
  title: 'ui/react-ui-core/next/form',
  render: DefaultStory,
  decorators: [withTheme()],
  parameters: { layout: 'centered' },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const part = (root: HTMLElement, testId: string, selector: string) => {
  const element = root.querySelector<HTMLElement>(`[data-testid="${testId}"] ${selector}`);
  if (!element) {
    throw new Error(`missing ${testId} ${selector}`);
  }
  return element.getBoundingClientRect();
};

export const Default: Story = {
  play: async ({ canvasElement }) => {
    // Label above its control, sharing the field's left edge.
    for (const field of ['name', 'email', 'role', 'website']) {
      const label = part(canvasElement, field, 'label');
      const control = part(canvasElement, field, '.nx-control');
      await expect(label.bottom, field).toBeLessThanOrEqual(control.top + 0.5);
      await expect(label.left, field).toBeCloseTo(control.left, 0);
    }

    const canvas = within(canvasElement);
    await expect(canvas.getByRole('textbox', { name: 'Name' })).toBeInTheDocument();
    await expect(canvas.getByRole('textbox', { name: 'Website' })).toHaveAttribute('aria-invalid', 'true');
    await expect(canvas.getByText('Enter a valid URL.')).toBeVisible();
    await expect(canvas.getByRole('combobox', { name: 'Role' })).toBeInTheDocument();
    await expect(canvas.getByRole('checkbox', { name: 'Subscribe to updates' })).not.toBeChecked();
    await expect(canvas.getByRole('button', { name: 'Save' })).toHaveAttribute('type', 'submit');
  },
};
