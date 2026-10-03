//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useRef, useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { random } from '@dxos/random';

import { withLayout, withTheme } from '../../../testing/index.ts';
import { type Size } from '../../sizes.ts';
import { GEOMETRY, byTestId, expectAnchoredBelow, expectArrow, expectPopupSize } from '../../testing.ts';
import { SIZE_ARG_TYPES, type SizeArgs, withSizes } from '../../testing/stories.tsx';
import * as Button from '../Button/Button.tsx';
import * as Field from '../Field/Field.tsx';
import * as Group from '../Group/Group.tsx';
import * as Input from '../Input/Input.tsx';
import * as Typography from '../Typography/Typography.tsx';
import * as VirtualAnchor from '../VirtualAnchor/VirtualAnchor.ts';
import * as Popover from './Popover.tsx';

type SharePopoverProps = {
  /** Overrides the size the popover inherits from its trigger's row. */
  contentSize?: Size;
  arrow?: boolean;
  label: string;
  testId: string;
};

const SharePopover = ({ contentSize, arrow, label, testId }: SharePopoverProps) => (
  <Popover.Root>
    <Popover.Trigger asChild>
      <Button.Button data-testid={`${testId}-trigger`}>{label}</Button.Button>
    </Popover.Trigger>
    <Popover.Content size={contentSize} arrow={arrow} data-testid={testId}>
      <Popover.Header>
        <Popover.Title>Share space</Popover.Title>
        <Popover.CloseTrigger />
      </Popover.Header>
      <Popover.Description>Anyone with the link can view.</Popover.Description>
      <Field.Root>
        <Field.Label>Link</Field.Label>
        <Input.Input defaultValue='https://composer.space/s/123' readOnly />
      </Field.Root>
      <Group.Group justify='end'>
        <Popover.CloseTrigger asChild>
          <Button.Button>Done</Button.Button>
        </Popover.CloseTrigger>
      </Group.Group>
    </Popover.Content>
  </Popover.Root>
);

random.seed(123);

const NOTES = Array.from({ length: 30 }, () => random.lorem.sentence());

/** A modal popover whose Body scrolls, portalled into a local element instead of the body. */
const NotesPopover = ({ size }: SizeArgs) => {
  const container = useRef<HTMLDivElement>(null);
  return (
    <>
      <Popover.Root modal>
        <Popover.Trigger asChild>
          <Button.Button data-testid={`notes-${size}-trigger`}>Notes</Button.Button>
        </Popover.Trigger>
        <Popover.Content container={container} data-testid={`notes-${size}`}>
          <Popover.Header>
            <Popover.Title>Notes</Popover.Title>
            <Popover.CloseTrigger />
          </Popover.Header>
          <Popover.Body data-testid={`notes-${size}-body`}>
            {NOTES.map((note, index) => (
              <Typography.Typography key={index}>{note}</Typography.Typography>
            ))}
          </Popover.Body>
          <Group.Group justify='end'>
            <Popover.CloseTrigger asChild>
              <Button.Button>Done</Button.Button>
            </Popover.CloseTrigger>
          </Group.Group>
        </Popover.Content>
      </Popover.Root>
      <div ref={container} data-testid={`notes-${size}-container`} />
    </>
  );
};

/** A popover with no trigger, opened under control and anchored to a text span (a virtual trigger). */
const AnchoredPopover = ({ size }: SizeArgs) => {
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLSpanElement>(null);
  return (
    <>
      <Button.Button onClick={() => setOpen(true)} data-testid={`anchored-${size}-trigger`}>
        Open at anchor
      </Button.Button>
      <Typography.Typography asChild>
        <span ref={anchor} data-testid={`anchor-${size}`}>
          Anchor
        </span>
      </Typography.Typography>
      <Popover.Root
        open={open}
        onOpenChange={({ open }) => setOpen(open)}
        positioning={VirtualAnchor.useVirtualAnchor(anchor)}
      >
        <Popover.Content data-testid={`anchored-${size}`}>
          <Popover.Description>Anchored to a span.</Popover.Description>
        </Popover.Content>
      </Popover.Root>
    </>
  );
};

/**
 * A popover with the default arrow and one with `arrow={false}`, a modal one with a scrolling Body portalled into a
 * local element, and one anchored to a span; the content takes the trigger row's size (Phase 4 decision 2), except
 * the arrowless one, which is `lg` at every size.
 */
const DefaultStory = ({ size = 'md' }: SizeArgs) => (
  <Group.Group>
    <SharePopover label='Share' testId={`popover-${size}`} />
    <SharePopover contentSize='lg' arrow={false} label='Share (no arrow)' testId={`plain-${size}`} />
    <NotesPopover size={size} />
    <AnchoredPopover size={size} />
  </Group.Group>
);

const meta = {
  title: 'ui/react-ui-core/components/Popover',
  render: DefaultStory,
  decorators: [withSizes(), withLayout({ classNames: 'p-0 w-[32rem]' }), withTheme()],
  args: { size: 'md' },
  argTypes: SIZE_ARG_TYPES,
  parameters: { layout: 'centered' },
} satisfies Meta<SizeArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * Escape, the header's close button and Done each close it, returning focus to the trigger. The popover takes its
 * own size, since it leaves the trigger's sized scope; `arrow={false}` drops the arrow and its share of the gutter.
 * It opens a portalled `dialog` named by its title, 2px from the trigger at `level='popup'`. `modal` keeps focus
 * inside; the Body scrolls within the space available to the popup; `container` portals it into a given element; and a
 * popover without a trigger anchors to `positioning.getAnchorRect`. The story ends open.
 */
export const Test: Story = {
  args: { allSizes: true },
  play: async ({ canvasElement }) => {
    const trigger = byTestId(canvasElement, 'popover-md-trigger');
    const body = within(canvasElement.ownerDocument.body);

    await userEvent.click(trigger);
    const dismissed = await body.findByRole('dialog');
    // Escape reaches the popover once its initial focus has landed inside it.
    await waitFor(() => expect(dismissed.contains(canvasElement.ownerDocument.activeElement)).toBe(true));
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(body.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(trigger).toHaveFocus());

    for (const name of ['Close', 'Done']) {
      await userEvent.click(trigger);
      const reopened = await body.findByRole('dialog');
      await userEvent.click(within(reopened).getByRole('button', { name }));
      await waitFor(() => expect(body.queryByRole('dialog'), name).toBeNull());
    }

    await userEvent.click(byTestId(canvasElement, 'popover-sm-trigger'));
    const small = await body.findByRole('dialog');
    // The popover takes its trigger's row size (Phase 4 decision 2).
    await expectPopupSize(small, 'sm');
    const header = small.querySelector<HTMLElement>('[data-part="header"]');
    await expect(header?.getBoundingClientRect().height).toBeCloseTo(GEOMETRY.sm.block, 0);
    await userEvent.click(within(small).getByRole('button', { name: 'Done' }));
    await waitFor(() => expect(body.queryByRole('dialog')).toBeNull());

    const plainTrigger = byTestId(canvasElement, 'plain-md-trigger');
    await userEvent.click(plainTrigger);
    const plain = await body.findByRole('dialog');
    await expect(plain.querySelector('[data-part="arrow"]')).toBeNull();
    // An explicit size wins over the inherited one.
    await expectPopupSize(plain, 'lg');
    await expectAnchoredBelow(plainTrigger, plain, 'center');
    await userEvent.click(within(plain).getByRole('button', { name: 'Done' }));
    await waitFor(() => expect(body.queryByRole('dialog')).toBeNull());

    // Modal, scrolling Body, portalled into a local element.
    await userEvent.click(byTestId(canvasElement, 'notes-md-trigger'));
    const notes = await body.findByTestId('notes-md');
    await expect(byTestId(canvasElement, 'notes-md-container').contains(notes)).toBe(true);
    const notesBody = byTestId(notes, 'notes-md-body');
    const viewport = notesBody.querySelector<HTMLElement>('.dx-scroll-viewport');
    await waitFor(() => expect(viewport && viewport.scrollHeight > viewport.clientHeight).toBe(true));
    await expect(notes.getBoundingClientRect().bottom).toBeLessThanOrEqual(window.innerHeight);
    await waitFor(() => expect(notes.contains(canvasElement.ownerDocument.activeElement)).toBe(true));
    for (let tab = 0; tab < 4; tab++) {
      await userEvent.tab();
      await expect(notes.contains(canvasElement.ownerDocument.activeElement)).toBe(true);
    }
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(body.queryByTestId('notes-md')).toBeNull());

    // A virtual trigger.
    await userEvent.click(byTestId(canvasElement, 'anchored-md-trigger'));
    const anchored = await body.findByTestId('anchored-md');
    await expectAnchoredBelow(byTestId(canvasElement, 'anchor-md'), anchored, 'center');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(body.queryByTestId('anchored-md')).toBeNull());

    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(trigger);
    const popover = await body.findByRole('dialog', { name: 'Share space' });
    await expect(popover).toBe(body.getByTestId('popover-md'));
    await expect(popover).toHaveAccessibleDescription('Anyone with the link can view.');
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(popover).toHaveAttribute('data-surface', 'popup');
    await expect(popover).toHaveAttribute('data-size', 'md');
    await expect(getComputedStyle(popover).getPropertyValue('--dx-level').trim()).toBe('5');
    await expectAnchoredBelow(trigger, popover, 'center');
    await expectArrow(trigger, popover);
    await waitFor(() => expect(popover.contains(canvasElement.ownerDocument.activeElement)).toBe(true));
  },
};
