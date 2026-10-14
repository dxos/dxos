//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { type Identity } from '@dxos/halo';
import { PublicKey } from '@dxos/keys';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations as shellTranslations } from '@dxos/shell/react';

import { translations } from '#translations';

import { DevicesForm } from './DevicesForm.tsx';

const makeDevices = (count: number): Identity.DeviceInfo[] =>
  Array.from({ length: count }, (_, index) => ({
    key: PublicKey.random().toHex(),
    kind: index === 1 ? 'agent-managed' : 'browser',
    label: index === 1 ? 'EDGE Agent' : undefined,
    os: 'macOS',
    platform: index % 5 === 4 ? 'Safari' : 'Chrome',
    current: index === 0,
    presence: index < 2 ? 'online' : 'offline',
  }));

const meta = {
  title: 'plugins/plugin-client/components/DevicesForm',
  component: DevicesForm,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: { layout: 'fullscreen', translations: [...translations, ...shellTranslations] },
} satisfies Meta<typeof DevicesForm>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { devices: makeDevices(3) },
};

/** An identity used on many browsers: the list runs past the panel and scrolls with the form. */
export const LongList: Story = {
  args: { devices: makeDevices(30) },
};

/** The form is the one scroller: the list has no scroll area of its own to catch the wheel. */
export const TestLongListScrollsWithForm: Story = {
  args: { devices: makeDevices(30) },
  play: async ({ canvasElement }) => {
    const items = await within(canvasElement).findAllByTestId(/^device-list-item/);
    await expect(items).toHaveLength(30);
    const scrollers = [...canvasElement.querySelectorAll<HTMLElement>('*')].filter(
      (element) =>
        ['auto', 'scroll'].includes(getComputedStyle(element).overflowY) &&
        element.scrollHeight > element.clientHeight + 1,
    );
    await expect(scrollers).toHaveLength(1);
    await expect(scrollers[0].contains(items[29])).toBe(true);
  },
};

/** The value, or a failure naming what is missing. */
const required = <T,>(value: T | null | undefined, name: string): T => {
  if (value === null || value === undefined) {
    throw new Error(`Missing ${name}.`);
  }
  return value;
};

const highlighted = (content: HTMLElement) =>
  required(content.querySelector<HTMLElement>('[role="option"][data-highlighted]'), 'highlighted row');

/**
 * The devices are Listbox rows: the arrow keys move the highlight, and the ring is drawn over the whole row, so the
 * device tile at its start and the tag at its end sit inside it rather than covering it.
 */
export const TestRows: Story = {
  args: { devices: makeDevices(3) },
  play: async ({ canvasElement }) => {
    const content = await within(canvasElement).findByRole('listbox');
    const rows = within(content).getAllByRole('option');
    await expect(rows).toHaveLength(3);

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
    // Above the row's parts, so the tile flush with the row's start cannot hide the ring's edge.
    await expect(Number(ring.zIndex)).toBeGreaterThan(0);
    const tile = required(first.querySelector('[data-part="item-icon"]'), 'tile').getBoundingClientRect();
    const label = required(first.querySelector('[data-part="item-text"]'), 'label').getBoundingClientRect();
    await expect(tile.left).toBeGreaterThanOrEqual(row.left);
    await expect(tile.right).toBeLessThanOrEqual(label.left + 1);
    await expect(label.right).toBeLessThanOrEqual(row.right);
  },
};
