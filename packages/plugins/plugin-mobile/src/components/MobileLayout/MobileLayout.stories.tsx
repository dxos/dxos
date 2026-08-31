//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type PropsWithChildren, useEffect, useState } from 'react';

import { Column, Flex, Input, Panel, Splitter, type SplitterMode, Toolbar } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { WithKeyboard } from '../../testing';
import { MobileLayout, type MobileLayoutRootProps } from './MobileLayout';

const StoryPanel = ({ children, label }: PropsWithChildren<{ label: string }>) => {
  return (
    <Panel.Root>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          {label}
          <Toolbar.Separator />
          {children}
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content asChild>
        <Column.Root gutter='sm' classNames='py-form-chrome'>
          <Column.Center>
            <Flex column>
              <Input.Root>
                <Input.TextInput placeholder={label} />
              </Input.Root>
            </Flex>
          </Column.Center>
        </Column.Root>
      </Panel.Content>
    </Panel.Root>
  );
};

const DefaultStory = () => {
  const [splitterMode, setSplitterMode] = useState<SplitterMode>('start');
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    setSplitterMode((current) => (current === 'split' ? 'end' : current));
  }, [keyboardOpen]);

  return (
    <WithKeyboard>
      <MobileLayout.Root onKeyboardOpenChange={setKeyboardOpen}>
        <MobileLayout.Panel safe={{ top: true, bottom: splitterMode === 'start' }}>
          <Splitter.Root orientation='vertical' mode={splitterMode} size={24}>
            <Splitter.Panel position='start'>
              <StoryPanel label='Main'>
                {splitterMode === 'start' && (
                  <Toolbar.IconButton icon='ph--plus--regular' label='Open' onClick={() => setSplitterMode('split')} />
                )}
              </StoryPanel>
            </Splitter.Panel>
            <Splitter.Panel position='end'>
              <StoryPanel label='Drawer'>
                <Toolbar.IconButton
                  icon={splitterMode === 'end' ? 'ph--arrow-down--regular' : 'ph--arrow-up--regular'}
                  label={splitterMode === 'end' ? 'Collapse' : 'Expand'}
                  onClick={() => setSplitterMode((splitterMode) => (splitterMode === 'split' ? 'end' : 'split'))}
                />
                <Toolbar.IconButton icon='ph--x--regular' label='Close' onClick={() => setSplitterMode('start')} />
              </StoryPanel>
            </Splitter.Panel>
          </Splitter.Root>
        </MobileLayout.Panel>
      </MobileLayout.Root>
    </WithKeyboard>
  );
};

const meta: Meta<MobileLayoutRootProps> = {
  title: 'plugins/plugin-mobile/components/MobileLayout',
  component: MobileLayout.Root,
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column', classNames: 'relative' })],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<MobileLayoutRootProps>;

export const Default: Story = {};
