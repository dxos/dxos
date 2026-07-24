//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { log } from '@dxos/log';
import { random } from '@dxos/random';
import { Panel, Toolbar } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { LogPanel } from './LogPanel';

random.seed(123);

const DefaultStory = () => (
  <Panel.Root classNames='bs-full'>
    <Panel.Toolbar asChild>
      <Toolbar.Root>
        <Toolbar.Button
          onClick={() =>
            log.info(random.lorem.sentences(), {
              meta: {
                label: random.lorem.word(),
              },
            })
          }
        >
          Info
        </Toolbar.Button>
        <Toolbar.Button onClick={() => log.warn(random.lorem.sentences())}>Warn</Toolbar.Button>
        <Toolbar.Button onClick={() => log.error(random.lorem.sentences())}>Error</Toolbar.Button>
      </Toolbar.Root>
    </Panel.Toolbar>
    <Panel.Content>
      <LogPanel classNames='bs-full' initialFilter='info' />
    </Panel.Content>
  </Panel.Root>
);

const meta = {
  title: 'ui/react-ui-debug/LogPanel',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
