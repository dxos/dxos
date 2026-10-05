//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { withTheme } from '@dxos/react-ui/testing';

import { createContactFixtures } from '../../testing/fixtures/index.ts';
import { translations } from '../../translations.ts';
import { ContactList } from './ContactList.tsx';

const { spaces, contacts } = createContactFixtures();

const meta = {
  title: 'sdk/shell/ContactList',
  component: ContactList,
  decorators: [withTheme()],
  parameters: { translations },
} satisfies Meta<typeof ContactList>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { contacts, spaces } };

export const Filtered: Story = { args: { contacts, spaces, filter: 'bo' } };

export const Empty: Story = { args: { contacts: [], spaces } };

/**
 * Each contact reads left to right: the avatar in its rail, the name beside it with the shared spaces under the name,
 * and the identity with its copy button at the row's end.
 */
export const TestLayout: Story = {
  args: { contacts, spaces },
  play: async ({ canvasElement }) => {
    const items = Array.from(canvasElement.querySelectorAll<HTMLElement>('[data-testid="contact-list.item"]'));
    await expect(items.length).toBe(contacts.length);
    for (const item of items) {
      const row = item.getBoundingClientRect();
      const avatar = item.querySelector<HTMLElement>('[data-part="item-icon"]')?.getBoundingClientRect();
      const name = item.querySelector<HTMLElement>('[data-part="item-text"]')?.getBoundingClientRect();
      const tags = item.querySelector<HTMLElement>('[data-part="item-description"]')?.getBoundingClientRect();
      const copy = item.querySelector<HTMLElement>('button[aria-label]:not([data-testid])')?.getBoundingClientRect();
      // The avatar starts the row and the name follows it directly, rather than either floating mid-row.
      await expect((avatar?.left ?? Number.NaN) - row.left).toBeLessThan(24);
      await expect((name?.left ?? Number.NaN) - (avatar?.right ?? 0)).toBeLessThan(16);
      // The shared spaces sit under the name, starting where it does.
      if (tags) {
        await expect(Math.abs(tags.left - (name?.left ?? Number.NaN))).toBeLessThanOrEqual(1);
        await expect(tags.top).toBeGreaterThanOrEqual((name?.bottom ?? Number.NaN) - 1);
      }
      // The copy button ends the row.
      await expect(row.right - (copy?.right ?? Number.NaN)).toBeLessThan(24);
    }
  },
};
