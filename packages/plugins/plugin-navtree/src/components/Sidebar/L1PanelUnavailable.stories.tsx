//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Tabs } from '@dxos/react-ui-tabs';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { L1PanelUnavailable } from './L1PanelUnavailable';

const WORKSPACE = 'root/B4NRQGGJ7XSDT4WMGXCTZNBLTDYIWGXNQIB6JW3AVLW3G';

// The panel is absolutely positioned within the sidebar's tabs root, which the sidebar sizes; the
// story supplies both so the message renders at its real width.
const DefaultStory = () => (
  <Tabs.Root value={WORKSPACE} orientation='vertical' classNames='relative h-full'>
    <L1PanelUnavailable workspace={WORKSPACE} open />
  </Tabs.Root>
);

const meta = {
  title: 'plugins/plugin-navtree/components/L1PanelUnavailable',
  component: L1PanelUnavailable,
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    translations,
  },
} satisfies Meta<typeof L1PanelUnavailable>;

export default meta;

type Story = StoryObj<typeof L1PanelUnavailable>;

export const Default: Story = {};
