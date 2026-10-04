//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { random } from '@dxos/random';

import { translations } from '#translations';

import { withLayout, withTheme } from '../../../testing/index.ts';
import { type Size } from '../../sizes.ts';
import { byTestId, expectPopupSize, expectTooltip } from '../../testing.ts';
import { SIZE_ARG_TYPES, type SizeArgs, withSizes } from '../../testing/stories.tsx';
import { Button } from '../Button/Button.tsx';
import { Checkbox } from '../Checkbox/Checkbox.tsx';
import * as Field from '../Field/Field.tsx';
import { Group } from '../Group/Group.tsx';
import { Input } from '../Input/Input.tsx';
import * as Select from '../Select/Select.tsx';
import * as SystemButton from '../SystemButton/SystemButton.tsx';
import * as Typography from '../Typography/Typography.tsx';
import * as Dialog from './Dialog.tsx';

random.seed(123);

const PARAGRAPHS = Array.from({ length: 40 }, () => random.lorem.paragraph());

const ROLES: Select.Option[] = [
  { value: 'owner', label: 'Owner' },
  { value: 'editor', label: 'Editor' },
  { value: 'viewer', label: 'Viewer' },
];

const DESCRIPTION = 'Update how others see you.';

const ProfileForm = () => (
  <>
    <Field.Root data-testid='name'>
      <Field.Header>
        <Field.Label>Name</Field.Label>
      </Field.Header>
      <Input placeholder='Ada Lovelace' />
    </Field.Root>
    <Field.Root data-testid='email'>
      <Field.Header>
        <Field.Label>Email</Field.Label>
      </Field.Header>
      <Input type='email' placeholder='ada@example.com' />
    </Field.Root>
    <Field.Root data-testid='role'>
      <Select.Root items={ROLES}>
        <Field.Header>
          <Select.Label>Role</Select.Label>
        </Field.Header>
        <Select.Trigger placeholder='Select a role' />
        <Select.Content>
          {ROLES.map((item) => (
            <Select.Item key={item.value} item={item} />
          ))}
        </Select.Content>
      </Select.Root>
    </Field.Root>
    <Field.Root data-testid='subscribe'>
      <Checkbox label='Subscribe to updates' />
    </Field.Root>
  </>
);

type ProfileDialogProps = {
  /** Overrides the size the dialog inherits from its trigger's row. */
  contentSize?: Size;
  title: string;
  testId: string;
  /** Replaces the form with this many paragraphs. */
  paragraphs?: number;
};

const ProfileDialog = ({ contentSize, title, testId, paragraphs }: ProfileDialogProps) => (
  <Dialog.Root>
    <Dialog.Trigger asChild>
      <Button data-testid={`${testId}-trigger`}>{title}</Button>
    </Dialog.Trigger>
    <Dialog.Content size={contentSize} data-testid={testId}>
      <Dialog.Header data-testid='header'>
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.CloseTrigger data-testid='close' />
      </Dialog.Header>
      <Dialog.Body data-testid='body'>
        <Dialog.Description>{DESCRIPTION}</Dialog.Description>
        {paragraphs ? (
          PARAGRAPHS.slice(0, paragraphs).map((text, index) => <Typography.Text key={index}>{text}</Typography.Text>)
        ) : (
          <ProfileForm />
        )}
      </Dialog.Body>
      <Dialog.Footer data-testid='footer'>
        <Dialog.CloseTrigger asChild>
          <SystemButton.Cancel iconOnly={false} />
        </Dialog.CloseTrigger>
        <SystemButton.Save iconOnly={false} />
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Root>
);

/**
 * A form dialog, which takes its trigger row's size (Phase 4 decision 2), and one whose body scrolls, `lg` at every size.
 */
const DefaultStory = ({ size = 'md' }: SizeArgs) => (
  <Group>
    <ProfileDialog title='Edit profile' testId={`dialog-${size}`} />
    <ProfileDialog contentSize='lg' title='Read terms' paragraphs={40} testId={`long-${size}`} />
  </Group>
);

const meta = {
  title: 'ui/react-ui-core/components/Dialog',
  render: DefaultStory,
  decorators: [withSizes(), withLayout({ classNames: 'p-0 w-[32rem]' }), withTheme()],
  args: { size: 'md' },
  argTypes: SIZE_ARG_TYPES,
  parameters: { layout: 'centered', translations },
} satisfies Meta<SizeArgs>;

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
const open = async (canvasElement: HTMLElement, testId: string, name = 'Edit profile') => {
  await userEvent.click(byTestId(canvasElement, `${testId}-trigger`));
  const dialog = await within(canvasElement.ownerDocument.body).findByRole('dialog', { name });
  await waitFor(() => expect(dialog.contains(canvasElement.ownerDocument.activeElement)).toBe(true));
  return dialog;
};

export const Default: Story = {};

/** `srOnly` names and describes the dialog for assistive tech without showing a heading or text. */
export const HiddenTitle: Story = {
  render: () => (
    <Dialog.Root defaultOpen>
      <Dialog.Content data-testid='hidden-title'>
        <Dialog.Title srOnly>Settings</Dialog.Title>
        <Dialog.Description srOnly>{DESCRIPTION}</Dialog.Description>
        <Dialog.Body>
          <ProfileForm />
        </Dialog.Body>
      </Dialog.Content>
    </Dialog.Root>
  ),
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    const dialog = await body.findByRole('dialog', { name: 'Settings' });
    const title = dialog.querySelector<HTMLElement>('[data-part="title"]');
    await expect(title && title.getBoundingClientRect().width).toBeLessThanOrEqual(1);
  },
};

/** `closeOnInteractOutside={false}` on the Content (the part a surface renders) keeps the dialog open on an outside click. */
export const KeepOpenOutside: Story = {
  render: () => (
    <Dialog.Root defaultOpen>
      <Dialog.Content closeOnInteractOutside={false} data-testid='keep-open'>
        <Dialog.Header>
          <Dialog.Title>Unsaved</Dialog.Title>
        </Dialog.Header>
        <Dialog.Body>
          <ProfileForm />
        </Dialog.Body>
      </Dialog.Content>
    </Dialog.Root>
  ),
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    await body.findByTestId('keep-open');
    const scrim = canvasElement.ownerDocument.querySelector<HTMLElement>('.dx-dialog-backdrop');
    await expect(scrim).not.toBeNull();
    // A modal dialog makes the page inert to the pointer, so the press is dispatched rather than simulated.
    scrim?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerType: 'mouse' }));
    scrim?.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, button: 0, pointerType: 'mouse' }));
    scrim?.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0 }));
    await new Promise((resolve) => setTimeout(resolve, 200));
    await expect(body.queryByTestId('keep-open')).not.toBeNull();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(body.queryByTestId('keep-open')).toBeNull());
  },
};

/** The Root's `placement` places Content it does not render (here `start`: hung from the top). */
export const RootPlacement: Story = {
  render: () => (
    <Dialog.Root defaultOpen placement='start'>
      <Dialog.Content data-testid='hung'>
        <Dialog.Header>
          <Dialog.Title>Move to</Dialog.Title>
        </Dialog.Header>
        <Dialog.Body>
          <Typography.Text>{DESCRIPTION}</Typography.Text>
        </Dialog.Body>
      </Dialog.Content>
    </Dialog.Root>
  ),
  play: async ({ canvasElement }) => {
    const dialog = await within(canvasElement.ownerDocument.body).findByTestId('hung');
    await expect(dialog.parentElement).toHaveAttribute('data-placement', 'start');
    // Hung from the top: nearer the viewport's top than its bottom.
    const bounds = dialog.getBoundingClientRect();
    await expect(bounds.top).toBeLessThan(canvasElement.ownerDocument.documentElement.clientHeight - bounds.bottom);
  },
};

/** A non-modal dialog docked at the block end with no scrim (e.g. a chat panel): the page behind stays usable. */
export const Docked: Story = {
  render: () => (
    <Dialog.Root modal={false} defaultOpen>
      <Dialog.Content placement='end' scrim={false} data-testid='docked'>
        <Dialog.Header>
          <Dialog.Title>Chat</Dialog.Title>
        </Dialog.Header>
        <Dialog.Body>
          <Typography.Text>{DESCRIPTION}</Typography.Text>
        </Dialog.Body>
      </Dialog.Content>
    </Dialog.Root>
  ),
  play: async ({ canvasElement }) => {
    const document = canvasElement.ownerDocument;
    const dialog = await within(document.body).findByTestId('docked');
    await expect(document.querySelector('.dx-dialog-backdrop')).toBeNull();
    const positioner = dialog.parentElement;
    await expect(positioner && getComputedStyle(positioner).pointerEvents).toBe('none');
    await expect(getComputedStyle(dialog).pointerEvents).toBe('auto');
    // Docked: the dialog's bottom edge sits one rem above the viewport's.
    const viewport = document.documentElement.clientHeight;
    await expect(viewport - dialog.getBoundingClientRect().bottom).toBeCloseTo(16, 0);
  },
};

/** Header block height per size in px. */
const HEADER_BLOCK: [Size, number][] = [
  ['sm', 24],
  ['lg', 40],
];

/**
 * Escape, Cancel and the header's close button each dismiss the dialog. The dialog takes its own size; long content
 * scrolls in the body while the footer stays in view. Opened, it has its roles, a shared gutter, a leading Save and a
 * nested Select that keeps it open; the header's close Button shows its label in a Tooltip above the modal dialog.
 * The story ends with the dialog and tooltip open.
 */
export const Test: Story = {
  args: { allSizes: true },
  play: async ({ canvasElement }) => {
    const trigger = byTestId(canvasElement, 'dialog-md-trigger');
    const body = within(canvasElement.ownerDocument.body);

    // Escape closes and returns focus to the trigger.
    await open(canvasElement, 'dialog-md');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(body.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(trigger).toHaveFocus());

    for (const name of ['Cancel', 'Close']) {
      const reopened = await open(canvasElement, 'dialog-md');
      await userEvent.click(within(reopened).getByRole('button', { name }));
      await waitFor(() => expect(body.queryByRole('dialog')).toBeNull());
    }

    for (const [size, block] of HEADER_BLOCK) {
      const sized = await open(canvasElement, `dialog-${size}`);
      // The dialog takes its trigger's row size (Phase 4 decision 2).
      await expectPopupSize(sized, size);
      await expect(within(sized).getByTestId('header').getBoundingClientRect().height, size).toBeCloseTo(block, 0);
      await userEvent.keyboard('{Escape}');
      await waitFor(() => expect(body.queryByRole('dialog')).toBeNull());
    }

    const long = await open(canvasElement, 'long-md', 'Read terms');
    // An explicit size wins over the inherited one.
    await expectPopupSize(long, 'lg');
    const viewport = long.querySelector<HTMLElement>('.dx-scroll-viewport');
    await expect(viewport).not.toBeNull();
    await expect(viewport && viewport.scrollHeight > viewport.clientHeight).toBe(true);

    const longBounds = long.getBoundingClientRect();
    await expect(longBounds.height).toBeLessThanOrEqual(window.innerHeight);
    const longFooter = within(long).getByTestId('footer').getBoundingClientRect();
    await expect(longFooter.bottom).toBeLessThanOrEqual(longBounds.bottom + 0.5);
    await expect(longFooter.height).toBeGreaterThan(0);
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(body.queryByRole('dialog')).toBeNull());

    const dialog = await open(canvasElement, 'dialog-md');
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
    const input = rect(dialog, '[data-testid="name"] .dx-input');
    await expect(
      footer.getBoundingClientRect().right - parseFloat(getComputedStyle(footer).paddingInlineEnd),
    ).toBeCloseTo(input.right, 0);

    // Save leads the actions.
    const save = within(dialog).getByRole('button', { name: 'Save' });
    const cancel = within(dialog).getByRole('button', { name: 'Cancel' });
    await expect(getComputedStyle(save).backgroundColor).not.toBe(getComputedStyle(cancel).backgroundColor);
    // The portalled Select popup is a nested layer: picking an option keeps the dialog open.
    await userEvent.click(within(dialog).getByRole('combobox', { name: 'Role' }));
    await userEvent.click(await body.findByRole('option', { name: 'Editor' }));
    await waitFor(() => expect(within(dialog).getByRole('combobox', { name: 'Role' })).toHaveTextContent('Editor'));
    await expect(body.getByRole('dialog', { name: 'Edit profile' })).toBeVisible();

    const close = within(dialog).getByRole('button', { name: 'Close' });
    await userEvent.hover(close);
    const tooltip = await expectTooltip(close, 'Close');
    await expect(tooltip).toBeVisible();
    await expect(tooltip.closest('[aria-hidden="true"]')).toBeNull();
    await expect(within(canvasElement.ownerDocument.body).getByRole('dialog')).toBeVisible();
  },
};
