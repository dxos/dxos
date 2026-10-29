//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { Invitation_State } from '@dxos/react-client/invitations';
import { withTheme } from '@dxos/react-ui/testing';

import { inviteWithState } from '../../testing/fixtures/index.ts';
import { translations } from '../../translations.ts';
import { InvitationList } from './InvitationList.tsx';

const meta = {
  title: 'sdk/shell/InvitationList',
  component: InvitationList,
  decorators: [withTheme()],
  parameters: { translations },
} satisfies Meta<typeof InvitationList>;

export default meta;

type Story = StoryObj<typeof meta>;

const STATES = [
  Invitation_State.INIT,
  Invitation_State.CONNECTING,
  Invitation_State.CONNECTED,
  Invitation_State.READY_FOR_AUTHENTICATION,
  Invitation_State.AUTHENTICATING,
  Invitation_State.SUCCESS,
  Invitation_State.TIMEOUT,
  Invitation_State.ERROR,
  Invitation_State.CANCELLED,
];

export const Default: Story = {
  args: {
    invitations: STATES.map(inviteWithState),
    send: () => {},
    createInvitationUrl: (invite) => invite,
  },
};

/** The value, or a failure naming what is missing. */
const required = <T,>(value: T | null | undefined, name: string): T => {
  if (value === null || value === undefined) {
    throw new Error(`Missing ${name}.`);
  }
  return value;
};

/** The highlighted row, as zag marks it. */
const highlighted = (content: HTMLElement) =>
  required(content.querySelector<HTMLElement>('[role="option"][data-highlighted]'), 'highlighted row');

/** A part of a row, by its `data-part`. */
const part = (row: HTMLElement, name: string) =>
  required(row.querySelector<HTMLElement>(`[data-part="${name}"]`), name).getBoundingClientRect();

/**
 * Each row is one Listbox option: the arrow keys move the highlight across rows, the ring is drawn over the whole row
 * (avatar through x), a pick opens the invitation, and the x cancels it without opening it.
 */
export const TestRows: Story = {
  args: {
    invitations: STATES.map(inviteWithState),
    send: fn(),
    onClickRemove: fn(),
    createInvitationUrl: (invite) => invite,
  },
  play: async ({ canvasElement, args }) => {
    const content = await within(canvasElement).findByRole('listbox');
    const rows = within(content).getAllByRole('option');
    await expect(rows).toHaveLength(STATES.length);

    // (b) Up/Down move the highlight from row to row.
    content.focus();
    await userEvent.keyboard('{ArrowDown}');
    const first = highlighted(content);
    await userEvent.keyboard('{ArrowDown}');
    await expect(rows.indexOf(highlighted(content))).toBe(rows.indexOf(first) + 1);
    await userEvent.keyboard('{ArrowUp}');
    await expect(highlighted(content)).toBe(first);

    // (a) The ring is an overlay of the whole row, so it frames the avatar and the trailing x alike.
    const row = first.getBoundingClientRect();
    const ring = getComputedStyle(first, '::before');
    await expect(ring.boxShadow).not.toBe('none');
    await expect(ring.position).toBe('absolute');
    await expect(Number.parseFloat(ring.width)).toBeCloseTo(row.width, 0);
    const icon = part(first, 'item-icon');
    const text = part(first, 'item-text');
    const remove = within(first).getByTestId('cancel-invitation').getBoundingClientRect();
    await expect(icon.left).toBeGreaterThanOrEqual(row.left);
    await expect(icon.right).toBeLessThanOrEqual(text.left + 1);
    await expect(remove.right).toBeLessThanOrEqual(row.right);
    // The x ends the row, inset only as any square control is, rather than padded inside it.
    await expect(row.right - remove.right).toBeLessThanOrEqual(2);

    // Enter opens the highlighted (shareable) invitation; the x cancels its own row and opens nothing.
    await userEvent.keyboard('{Enter}');
    await expect(args.send).toHaveBeenCalledTimes(1);
    await userEvent.click(within(rows[0]).getByTestId('cancel-invitation'));
    await expect(args.send).toHaveBeenCalledTimes(1);
    await userEvent.click(within(rows[rows.length - 1]).getByTestId('remove-invitation'));
    await expect(args.onClickRemove).toHaveBeenCalledTimes(1);
    await expect(args.send).toHaveBeenCalledTimes(1);
  },
};
