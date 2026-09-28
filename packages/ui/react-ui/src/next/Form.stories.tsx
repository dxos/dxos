//
// Copyright 2026 DXOS.org
//

import './theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { translations } from '#translations';

import { withTheme } from '../testing/index.ts';
import { Next } from './Next.tsx';
import { SIZE_ARG_TYPES, type SizeArgs } from './stories.tsx';
import { expectAnchoredBelow } from './testing.ts';

const ROLES: Next.SelectOption[] = [
  { value: 'owner', label: 'Owner' },
  { value: 'editor', label: 'Editor' },
  { value: 'viewer', label: 'Viewer' },
];

/** A basic form: each Field stacks its label above the control (decision 13). */
const DefaultStory = ({ size = 'md' }: SizeArgs) => (
  <div className='nx-scope @container w-[30rem] border border-separator' data-size={size}>
    <Next.Container gutter='rail' level='base'>
      <Next.Field.Root data-testid='name'>
        <Next.Field.Header>
          <Next.Field.Label>Name</Next.Field.Label>
        </Next.Field.Header>
        <Next.Input placeholder='Ada Lovelace' />
      </Next.Field.Root>

      <Next.Field.Root data-testid='email'>
        <Next.Field.Header>
          <Next.Field.Label>Email</Next.Field.Label>
          <Next.Button icon='ph--info--regular' label='About email' iconOnly data-testid='email-info' />
        </Next.Field.Header>
        <Next.Input type='email' placeholder='ada@example.com' />
        <Next.Field.HelperText>We never share your address.</Next.Field.HelperText>
      </Next.Field.Root>

      <Next.Field.Root data-testid='role'>
        <Next.Select.Root items={ROLES} positioning={{ sameWidth: true }}>
          <Next.Field.Header>
            <Next.Select.Label>Role</Next.Select.Label>
            <Next.Block data-testid='role-lock'>
              <Next.Icon icon='ph--lock-simple--regular' label='Restricted' />
            </Next.Block>
          </Next.Field.Header>
          <Next.Select.Trigger placeholder='Select a role' />
          <Next.Select.Content size={size}>
            {ROLES.map((item) => (
              <Next.Select.Item key={item.value} item={item} />
            ))}
          </Next.Select.Content>
        </Next.Select.Root>
      </Next.Field.Root>

      <Next.Field.Root invalid data-testid='website'>
        <Next.Field.Header>
          <Next.Field.Label>Website</Next.Field.Label>
          <Next.Button icon='ph--x--regular' label='Clear website' iconOnly />
        </Next.Field.Header>
        <Next.Input defaultValue='not a url' />
        <Next.Field.ErrorText>Enter a valid URL.</Next.Field.ErrorText>
      </Next.Field.Root>

      <Next.Field.Root data-testid='subscribe'>
        <Next.Checkbox label='Subscribe to updates' />
      </Next.Field.Root>

      <Next.Group justify='end' data-testid='actions'>
        <Next.SystemButton.Cancel iconOnly={false} />
        <Next.SystemButton.Save iconOnly={false} type='submit' />
      </Next.Group>
    </Next.Container>
  </div>
);

const meta = {
  title: 'ui/react-ui-core/next/form',
  render: DefaultStory,
  args: { size: 'md' },
  argTypes: SIZE_ARG_TYPES,
  decorators: [withTheme()],
  parameters: { layout: 'centered', translations },
} satisfies Meta<SizeArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

const part = (root: HTMLElement, testId: string, selector: string) => {
  const element = root.querySelector<HTMLElement>(`[data-testid="${testId}"] ${selector}`);
  if (!element) {
    throw new Error(`missing ${testId} ${selector}`);
  }
  return element.getBoundingClientRect();
};

export const Default: Story = {};

/** Labels above controls, control geometry, focus ring, Select popup and roles. */
export const Layout: Story = {
  play: async ({ canvasElement }) => {
    // Label above its control, sharing the field's left edge.
    for (const field of ['name', 'email', 'role', 'website']) {
      const label = part(canvasElement, field, 'label');
      const control = part(canvasElement, field, ':is(.nx-input, .nx-select-trigger)');
      await expect(label.bottom, field).toBeLessThanOrEqual(control.top + 0.5);
      await expect(label.left, field).toBeCloseTo(control.left, 0);
    }

    const canvas = within(canvasElement);
    await expect(canvas.getByRole('textbox', { name: 'Name' })).toBeInTheDocument();
    await expect(canvas.getByRole('textbox', { name: 'Website' })).toHaveAttribute('aria-invalid', 'true');
    await expect(canvas.getByText('Enter a valid URL.')).toBeVisible();
    await expect(canvas.getByRole('combobox', { name: 'Role' })).toBeInTheDocument();
    await expect(canvas.getByRole('checkbox', { name: 'Subscribe to updates' })).not.toBeChecked();
    const save = canvas.getByRole('button', { name: 'Save' });
    await expect(save).toHaveAttribute('type', 'submit');
    await expect(getComputedStyle(save).backgroundColor).not.toBe(
      getComputedStyle(canvas.getByRole('button', { name: 'Cancel' })).backgroundColor,
    );
    // Focus shows the themable ring (`--nx-focus-ring-color`), not ui-theme's.
    const name = canvas.getByRole('textbox', { name: 'Name' });
    await userEvent.click(name);
    await expect(getComputedStyle(name).boxShadow).not.toBe('none');

    // The checkbox's block-sized cell starts at the column's left edge, like every other control.
    const boxElement = canvasElement.querySelector<HTMLElement>('[data-scope="checkbox"][data-part="control"]');
    const box = boxElement?.getBoundingClientRect();
    const boxMargin = boxElement ? parseFloat(getComputedStyle(boxElement).marginLeft) : Number.NaN;
    await expect((box?.left ?? Number.NaN) - boxMargin).toBeCloseTo(part(canvasElement, 'name', '.nx-input').left, 0);

    // The label row is an sm block row; its trailing icon-only Button is inset in a block-sized cell ending at the control's edge.
    const header = canvasElement.querySelector('[data-testid="email"] [data-part="header"]')?.getBoundingClientRect();
    const info = canvas.getByRole('button', { name: 'About email' }).getBoundingClientRect();
    await expect(header?.height).toBeCloseTo(24, 0);
    await expect(info.height).toBeCloseTo(20, 0);
    await expect(info.right + 2).toBeCloseTo(part(canvasElement, 'email', '.nx-input').right, 0);

    // A trailing Block (a static icon) takes the same box and cell as an icon-only Button, so both line up at the row's end.
    const lock = canvas.getByTestId('role-lock').getBoundingClientRect();
    await expect(lock.width).toBeCloseTo(info.width, 0);
    await expect(lock.height).toBeCloseTo(info.height, 0);
    await expect(lock.right).toBeCloseTo(info.right, 0);

    // Checking draws the mark inside the box.
    await userEvent.click(canvas.getByText('Subscribe to updates'));
    const mark = canvasElement.querySelector('[data-scope="checkbox"][data-part="indicator"]:not([hidden]) svg');
    const markBox = mark?.getBoundingClientRect();
    await expect(markBox && box && markBox.top >= box.top && markBox.bottom <= box.bottom).toBe(true);
    await userEvent.click(canvas.getByText('Subscribe to updates'));

    // Labels read one text step below the controls.
    const labelFont = parseFloat(getComputedStyle(canvas.getByText('Name')).fontSize);
    const inputFont = parseFloat(getComputedStyle(canvas.getByRole('textbox', { name: 'Name' })).fontSize);
    await expect(labelFont).toBeLessThan(inputFont);

    // The popup sits close under its trigger.
    const trigger = canvas.getByRole('combobox', { name: 'Role' });
    await userEvent.click(trigger);
    const listbox = await within(canvasElement.ownerDocument.body).findByRole('listbox');
    await expectAnchoredBelow(trigger, listbox);
    await userEvent.keyboard('{Escape}');

    // Form actions claim no toolbar keyboard contract.
    await expect(canvas.queryByRole('toolbar')).toBeNull();
  },
};
