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
import { Next } from '../../Next.tsx';
import { type Size } from '../../sizes.ts';
import { byTestId, expectPopupSize, expectTooltip } from '../../testing.ts';
import { SIZE_ARG_TYPES, type SizeArgs, withSizes } from '../../testing/stories.tsx';

random.seed(123);

const PARAGRAPHS = Array.from({ length: 40 }, () => random.lorem.paragraph());

const ROLES: Next.SelectOption[] = [
  { value: 'owner', label: 'Owner' },
  { value: 'editor', label: 'Editor' },
  { value: 'viewer', label: 'Viewer' },
];

const DESCRIPTION = 'Update how others see you.';

const ProfileForm = () => (
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
      <Next.Select.Root items={ROLES}>
        <Next.Field.Header>
          <Next.Select.Label>Role</Next.Select.Label>
        </Next.Field.Header>
        <Next.Select.Trigger placeholder='Select a role' />
        <Next.Select.Content>
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

type ProfileDialogProps = {
  /** Overrides the size the dialog inherits from its trigger's row. */
  contentSize?: Size;
  title: string;
  testId: string;
  /** Replaces the form with this many paragraphs. */
  paragraphs?: number;
};

const ProfileDialog = ({ contentSize, title, testId, paragraphs }: ProfileDialogProps) => (
  <Next.Dialog.Root>
    <Next.Dialog.Trigger asChild>
      <Next.Button data-testid={`${testId}-trigger`}>{title}</Next.Button>
    </Next.Dialog.Trigger>
    <Next.Dialog.Content size={contentSize} data-testid={testId}>
      <Next.Dialog.Header data-testid='header'>
        <Next.Dialog.Title>{title}</Next.Dialog.Title>
        <Next.Dialog.CloseTrigger data-testid='close' />
      </Next.Dialog.Header>
      <Next.Dialog.Body data-testid='body'>
        <Next.Dialog.Description>{DESCRIPTION}</Next.Dialog.Description>
        {paragraphs ? (
          PARAGRAPHS.slice(0, paragraphs).map((text, index) => <Next.Typography key={index}>{text}</Next.Typography>)
        ) : (
          <ProfileForm />
        )}
      </Next.Dialog.Body>
      <Next.Dialog.Footer data-testid='footer'>
        <Next.Dialog.CloseTrigger asChild>
          <Next.SystemButton.Cancel iconOnly={false} />
        </Next.Dialog.CloseTrigger>
        <Next.SystemButton.Save iconOnly={false} />
      </Next.Dialog.Footer>
    </Next.Dialog.Content>
  </Next.Dialog.Root>
);

/**
 * A form dialog, which takes its trigger row's size (Phase 4 decision 2), and one whose body scrolls, `lg` at every size.
 */
const DefaultStory = ({ size = 'md' }: SizeArgs) => (
  <Next.Group>
    <ProfileDialog title='Edit profile' testId={`dialog-${size}`} />
    <ProfileDialog contentSize='lg' title='Read terms' paragraphs={40} testId={`long-${size}`} />
  </Next.Group>
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
    <Next.Dialog.Root defaultOpen>
      <Next.Dialog.Content data-testid='hidden-title'>
        <Next.Dialog.Title srOnly>Settings</Next.Dialog.Title>
        <Next.Dialog.Description srOnly>{DESCRIPTION}</Next.Dialog.Description>
        <Next.Dialog.Body>
          <ProfileForm />
        </Next.Dialog.Body>
      </Next.Dialog.Content>
    </Next.Dialog.Root>
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
    <Next.Dialog.Root defaultOpen>
      <Next.Dialog.Content closeOnInteractOutside={false} data-testid='keep-open'>
        <Next.Dialog.Header>
          <Next.Dialog.Title>Unsaved</Next.Dialog.Title>
        </Next.Dialog.Header>
        <Next.Dialog.Body>
          <ProfileForm />
        </Next.Dialog.Body>
      </Next.Dialog.Content>
    </Next.Dialog.Root>
  ),
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    await body.findByTestId('keep-open');
    const scrim = canvasElement.ownerDocument.querySelector<HTMLElement>('.nx-dialog-backdrop');
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
    <Next.Dialog.Root defaultOpen placement='start'>
      <Next.Dialog.Content data-testid='hung'>
        <Next.Dialog.Header>
          <Next.Dialog.Title>Move to</Next.Dialog.Title>
        </Next.Dialog.Header>
        <Next.Dialog.Body>
          <Next.Typography>{DESCRIPTION}</Next.Typography>
        </Next.Dialog.Body>
      </Next.Dialog.Content>
    </Next.Dialog.Root>
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
    <Next.Dialog.Root modal={false} defaultOpen>
      <Next.Dialog.Content placement='end' scrim={false} data-testid='docked'>
        <Next.Dialog.Header>
          <Next.Dialog.Title>Chat</Next.Dialog.Title>
        </Next.Dialog.Header>
        <Next.Dialog.Body>
          <Next.Typography>{DESCRIPTION}</Next.Typography>
        </Next.Dialog.Body>
      </Next.Dialog.Content>
    </Next.Dialog.Root>
  ),
  play: async ({ canvasElement }) => {
    const document = canvasElement.ownerDocument;
    const dialog = await within(document.body).findByTestId('docked');
    await expect(document.querySelector('.nx-dialog-backdrop')).toBeNull();
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
    const viewport = long.querySelector<HTMLElement>('.nx-scroll-viewport');
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
    const input = rect(dialog, '[data-testid="name"] .nx-input');
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
