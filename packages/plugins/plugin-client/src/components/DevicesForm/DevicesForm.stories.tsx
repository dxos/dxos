//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

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
