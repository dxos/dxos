//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type PropsWithChildren, useEffect, useState } from 'react';

import { Button, Column, Field, Flex, Input, Panel, Splitter, type SplitterMode, Toolbar } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { WithKeyboard } from '../../testing/index.ts';
import { MobileLayout, type MobileLayoutRootProps } from './MobileLayout.tsx';

const StoryPanel = ({ children, label }: PropsWithChildren<{ label: string }>) => {
  return (
    <Panel.Root>
      <Panel.Header>
        <Toolbar.Root>
          {label}
          <Toolbar.Separator />
          {children}
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body asChild>
        <Column.Root gutter='sm' classNames='py-form-chrome'>
          <Column.Center>
            <Flex column>
              <Field.Root>
                <Input placeholder={label} />
              </Field.Root>
            </Flex>
          </Column.Center>
        </Column.Root>
      </Panel.Body>
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
                  <Button icon='ph--plus--regular' label='Open' onClick={() => setSplitterMode('split')} />
                )}
              </StoryPanel>
            </Splitter.Panel>
            <Splitter.Panel position='end'>
              <StoryPanel label='Drawer'>
                <Button
                  icon={splitterMode === 'end' ? 'ph--arrow-down--regular' : 'ph--arrow-up--regular'}
                  label={splitterMode === 'end' ? 'Collapse' : 'Expand'}
                  onClick={() => setSplitterMode((splitterMode) => (splitterMode === 'split' ? 'end' : 'split'))}
                />
                <Button icon='ph--x--regular' label='Close' onClick={() => setSplitterMode('start')} />
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
