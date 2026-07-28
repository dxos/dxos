//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Tabs } from '@dxos/react-ui-tabs';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { L1Tabs } from './L1Tabs';

const WORKSPACE = 'root/B4NRQGGJ7XSDT4WMGXCTZNBLTDYIWGXNQIB6JW3AVLW3G';

// With no workspace matching the current tab, `L1Tabs` renders only its unavailable-workspace fallback.
// The panels are absolutely positioned within the sidebar's tabs root, which the sidebar sizes; the
// story supplies both so the message renders at its real width.
const UnavailableStory = () => (
  <Tabs.Root value={WORKSPACE} orientation='vertical' classNames='relative h-full'>
    <L1Tabs topLevelItems={[]} currentItemId={WORKSPACE} path={['root']} open />
  </Tabs.Root>
);

const meta = {
  title: 'plugins/plugin-navtree/components/L1Tabs',
  component: L1Tabs,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    translations,
  },
} satisfies Meta<typeof L1Tabs>;

export default meta;

type Story = StoryObj<typeof L1Tabs>;

export const UnavailableWorkspace: Story = {
  render: UnavailableStory,
};
