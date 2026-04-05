//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useRef } from 'react';

import { Panel } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { SpacetimeEditor, type SpacetimeController } from './SpacetimeEditor';
import { translations } from '../../translations';

type DefaulttoryProps = {};

const DefaultStory = (props: DefaulttoryProps) => {
  const controller = useRef<SpacetimeController>(null);

  return (
    <SpacetimeEditor.Root ref={controller}>
      <Panel.Root>
        <Panel.Toolbar asChild>
          <SpacetimeEditor.Toolbar alwaysActive />
        </Panel.Toolbar>
        <Panel.Content asChild>
          <SpacetimeEditor.Canvas />
        </Panel.Content>
      </Panel.Root>
    </SpacetimeEditor.Root>
  );
};

const meta = {
  title: 'plugins/plugin-spacetime/SpacetimeEditor',
  component: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    showAxes: true,
    showFps: true,
  },
};
