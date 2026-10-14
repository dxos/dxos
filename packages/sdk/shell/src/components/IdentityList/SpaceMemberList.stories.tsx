//
// Copyright 2023 DXOS.org
//

import { create } from '@bufbuild/protobuf';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { IdentityDid, PublicKey } from '@dxos/keys';
import { fromPublicKey } from '@dxos/protocols/buf';
import { SpaceMember_PresenceState, SpaceMemberSchema } from '@dxos/protocols/buf/dxos/client/services_pb';
import { SpaceMember_Role } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { withTheme } from '@dxos/react-ui/testing';

import { alice } from '../../testing/fixtures/index.ts';
import { translations } from '../../translations.ts';
import { SpaceMemberListImpl } from './SpaceMemberList.tsx';

const member = (displayName: string, presence: SpaceMember_PresenceState) =>
  create(SpaceMemberSchema, {
    role: SpaceMember_Role.EDITOR,
    identity: {
      did: IdentityDid.random(),
      identityKey: fromPublicKey(PublicKey.random()),
      profile: { displayName },
    },
    presence,
  });

const members = [
  alice,
  member('Bob', SpaceMember_PresenceState.OFFLINE),
  member('Carol', SpaceMember_PresenceState.ONLINE),
];

const meta = {
  title: 'sdk/shell/SpaceMemberList',
  component: SpaceMemberListImpl,
  decorators: [withTheme()],
  parameters: { translations },
} satisfies Meta<typeof SpaceMemberListImpl>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { members } };

export const Empty: Story = { args: { members: [] } };

/** The value, or a failure naming what is missing. */
const required = <T,>(value: T | null | undefined, name: string): T => {
  if (value === null || value === undefined) {
    throw new Error(`Missing ${name}.`);
  }
  return value;
};

const highlighted = (content: HTMLElement) =>
  required(content.querySelector<HTMLElement>('[role="option"][data-highlighted]'), 'highlighted row');

/** The arrow keys move the highlight across members, the ring frames avatar and name alike, and Enter picks one. */
export const TestRows: Story = {
  args: { members, onSelect: fn() },
  play: async ({ canvasElement, args }) => {
    const content = await within(canvasElement).findByRole('listbox');
    const rows = within(content).getAllByRole('option');
    await expect(rows).toHaveLength(members.length);

    content.focus();
    await userEvent.keyboard('{ArrowDown}');
    const first = highlighted(content);
    await userEvent.keyboard('{ArrowDown}');
    await expect(rows.indexOf(highlighted(content))).toBe(rows.indexOf(first) + 1);
    await userEvent.keyboard('{ArrowUp}');
    await expect(highlighted(content)).toBe(first);

    const row = first.getBoundingClientRect();
    const ring = getComputedStyle(first, '::before');
    await expect(ring.boxShadow).not.toBe('none');
    await expect(Number.parseFloat(ring.width)).toBeCloseTo(row.width, 0);
    const avatar = required(first.querySelector('[data-part="item-icon"]'), 'avatar').getBoundingClientRect();
    await expect(avatar.left).toBeGreaterThanOrEqual(row.left);
    await expect(avatar.right).toBeLessThanOrEqual(row.right);

    await userEvent.keyboard('{Enter}');
    await expect(args.onSelect).toHaveBeenCalledWith(members[rows.indexOf(first)]);
  },
};
