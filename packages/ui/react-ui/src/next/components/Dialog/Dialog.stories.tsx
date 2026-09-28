//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { random } from '@dxos/random';

import { withTheme } from '../../../testing/index.ts';
import { Next } from '../../Next.tsx';
import { type Size } from '../../sizes.ts';

random.seed(123);

const PARAGRAPHS = Array.from({ length: 40 }, () => random.lorem.paragraph());

const ROLES: Next.SelectOption[] = [
  { value: 'owner', label: 'Owner' },
  { value: 'editor', label: 'Editor' },
  { value: 'viewer', label: 'Viewer' },
];

const DESCRIPTION = 'Update how others see you.';

type StoryArgs = {
  /** One trigger and dialog per size. */
  sizes: Size[];
  /** Replaces the form with this many paragraphs. */
  paragraphs?: number;
};

const ProfileForm = ({ size }: { size: Size }) => (
  <>
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
    <Next.Field.Root data-testid='role'>
      <Next.Select.Root items={ROLES} positioning={{ sameWidth: true }}>
        <Next.Field.Header>
          <Next.Select.Label>Role</Next.Select.Label>
        </Next.Field.Header>
        <Next.Select.Trigger placeholder='Select a role' />
        <Next.Select.Content size={size}>
          {ROLES.map((item) => (
            <Next.Select.Item key={item.value} item={item} />
          ))}
        </Next.Select.Content>
      </Next.Select.Root>
    </Next.Field.Root>
    <Next.Field.Root data-testid='subscribe'>
      <Next.Checkbox label='Subscribe to updates' />
    </Next.Field.Root>
  </>
);

const DefaultStory = ({ sizes, paragraphs }: StoryArgs) => (
  <div className='flex gap-2'>
    {sizes.map((size) => (
      <Next.Dialog.Root key={size}>
        <Next.Dialog.Trigger asChild>
          <Next.Button data-testid={`trigger-${size}`}>
            {sizes.length > 1 ? `Open ${size}` : 'Edit profile'}
          </Next.Button>
        </Next.Dialog.Trigger>
        <Next.Dialog.Content size={size} data-testid={`dialog-${size}`}>
          <Next.Dialog.Header data-testid='header'>
            <Next.Dialog.Title>Edit profile</Next.Dialog.Title>
            <Next.Dialog.CloseTrigger data-testid='close' />
          </Next.Dialog.Header>
          <Next.Dialog.Body data-testid='body'>
            <Next.Dialog.Description>{DESCRIPTION}</Next.Dialog.Description>
            {paragraphs ? (
              PARAGRAPHS.slice(0, paragraphs).map((text, index) => (
                <Next.Typography key={index}>{text}</Next.Typography>
              ))
            ) : (
              <ProfileForm size={size} />
            )}
          </Next.Dialog.Body>
          <Next.Dialog.Footer data-testid='footer'>
            <Next.Dialog.CloseTrigger asChild>
              <Next.Button>Cancel</Next.Button>
            </Next.Dialog.CloseTrigger>
            <Next.Button variant='primary'>Save</Next.Button>
          </Next.Dialog.Footer>
        </Next.Dialog.Content>
      </Next.Dialog.Root>
    ))}
  </div>
);

const meta = {
  title: 'ui/react-ui-core/next/dialog',
  render: DefaultStory,
  decorators: [withTheme()],
  parameters: { layout: 'centered' },
  args: { sizes: ['md'] },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

const rect = (root: HTMLElement, selector: string) => {
  const element = root.querySelector<HTMLElement>(selector);
  if (!element) {
    throw new Error(`missing ${selector}`);
  }
  return element.getBoundingClientRect();
};

/** Opens the dialog from its trigger and returns it once focus has moved inside. */
const open = async (canvasElement: HTMLElement, size: Size) => {
  await userEvent.click(within(canvasElement).getByTestId(`trigger-${size}`));
  const dialog = await within(canvasElement.ownerDocument.body).findByRole('dialog', { name: 'Edit profile' });
  await waitFor(() => expect(dialog.contains(canvasElement.ownerDocument.activeElement)).toBe(true));
  return dialog;
};

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByTestId('trigger-md');
    const dialog = await open(canvasElement, 'md');
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await expect(dialog).toHaveAccessibleDescription(DESCRIPTION);
    await expect(dialog).toHaveAttribute('data-surface', 'raised');
    await expect(dialog).toHaveAttribute('data-scope', 'dialog');
    await expect(dialog).toHaveAttribute('data-part', 'content');

    // Title, field labels and the footer's content edge share the body's gutter.
    const title = within(dialog).getByRole('heading', { name: 'Edit profile' }).getBoundingClientRect();
    const footer = within(dialog).getByTestId('footer');
    const footerStart = footer.getBoundingClientRect().left + parseFloat(getComputedStyle(footer).paddingInlineStart);
    for (const field of ['name', 'email', 'role']) {
      const label = rect(dialog, `[data-testid="${field}"] label`);
      await expect(label.left, field).toBeCloseTo(title.left, 0);
    }
    await expect(footerStart).toBeCloseTo(title.left, 0);
    const input = rect(dialog, '[data-testid="name"] .nx-input');
    await expect(
      footer.getBoundingClientRect().right - parseFloat(getComputedStyle(footer).paddingInlineEnd),
    ).toBeCloseTo(input.right, 0);

    // Save leads the actions.
    const save = within(dialog).getByRole('button', { name: 'Save' });
    const cancel = within(dialog).getByRole('button', { name: 'Cancel' });
    await expect(getComputedStyle(save).backgroundColor).not.toBe(getComputedStyle(cancel).backgroundColor);
    // The portalled Select popup is a nested layer: picking an option keeps the dialog open.
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.click(within(dialog).getByRole('combobox', { name: 'Role' }));
    await userEvent.click(await body.findByRole('option', { name: 'Editor' }));
    await waitFor(() => expect(within(dialog).getByRole('combobox', { name: 'Role' })).toHaveTextContent('Editor'));
    await expect(body.getByRole('dialog', { name: 'Edit profile' })).toBeVisible();
    within(dialog).getByRole('button', { name: 'Save' }).focus();

    // Escape closes and returns focus to the trigger.
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(within(canvasElement.ownerDocument.body).queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(trigger).toHaveFocus());

    // Cancel and the header's close button close it too.
    for (const name of ['Cancel', 'Close']) {
      const reopened = await open(canvasElement, 'md');
      await userEvent.click(within(reopened).getByRole('button', { name }));
      await waitFor(() => expect(within(canvasElement.ownerDocument.body).queryByRole('dialog')).toBeNull());
    }
  },
};

export const LongContent: Story = {
  args: { paragraphs: 40 },
  play: async ({ canvasElement }) => {
    const dialog = await open(canvasElement, 'md');
    const viewport = dialog.querySelector<HTMLElement>('.nx-scroll-viewport');
    await expect(viewport).not.toBeNull();
    await expect(viewport && viewport.scrollHeight > viewport.clientHeight).toBe(true);

    const bounds = dialog.getBoundingClientRect();
    await expect(bounds.height).toBeLessThanOrEqual(window.innerHeight);
    const footer = within(dialog).getByTestId('footer').getBoundingClientRect();
    await expect(footer.bottom).toBeLessThanOrEqual(bounds.bottom + 0.5);
    await expect(footer.height).toBeGreaterThan(0);
    await userEvent.keyboard('{Escape}');
  },
};

/** Header block height per size in px. */
const HEADER_BLOCK: [Size, number][] = [
  ['sm', 24],
  ['lg', 40],
];

export const Sizes: Story = {
  args: { sizes: ['sm', 'lg'] },
  play: async ({ canvasElement }) => {
    for (const [size, block] of HEADER_BLOCK) {
      const dialog = await open(canvasElement, size);
      await expect(dialog).toHaveAttribute('data-size', size);
      await expect(within(dialog).getByTestId('header').getBoundingClientRect().height, size).toBeCloseTo(block, 0);
      await userEvent.keyboard('{Escape}');
      await waitFor(() => expect(within(canvasElement.ownerDocument.body).queryByRole('dialog')).toBeNull());
    }
  },
};
