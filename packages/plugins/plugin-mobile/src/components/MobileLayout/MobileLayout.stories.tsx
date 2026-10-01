//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type PropsWithChildren, useEffect, useState } from 'react';

import { Next } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { WithKeyboard } from '../../testing/index.ts';
import { MobileLayout, type MobileLayoutRootProps } from './MobileLayout.tsx';

const StoryPanel = ({ children, label }: PropsWithChildren<{ label: string }>) => {
  return (
    <Next.Panel.Root>
      <Next.Panel.Header>
        <Next.Toolbar.Root>
          {label}
          <Next.Toolbar.Separator />
          {children}
        </Next.Toolbar.Root>
      </Next.Panel.Header>
      <Next.Panel.Body asChild>
        <Next.Container gutter='sm' classNames='py-form-chrome'>
          <Next.Field.Root>
            <Next.Input placeholder={label} />
          </Next.Field.Root>
        </Next.Container>
      </Next.Panel.Body>
    </Next.Panel.Root>
  );
};

const DefaultStory = () => {
  const [splitterMode, setSplitterMode] = useState<Next.SplitterMode>('start');
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    setSplitterMode((current) => (current === 'split' ? 'end' : current));
  }, [keyboardOpen]);

  return (
    <WithKeyboard>
      <MobileLayout.Root onKeyboardOpenChange={setKeyboardOpen}>
        <MobileLayout.Panel safe={{ top: true, bottom: splitterMode === 'start' }}>
          <Next.Splitter.Root orientation='vertical' mode={splitterMode} size={24}>
            <Next.Splitter.Panel position='start'>
              <StoryPanel label='Main'>
                {splitterMode === 'start' && (
                  <Next.Button icon='ph--plus--regular' label='Open' onClick={() => setSplitterMode('split')} />
                )}
              </StoryPanel>
            </Next.Splitter.Panel>
            <Next.Splitter.Panel position='end'>
              <StoryPanel label='Drawer'>
                <Next.Button
                  icon={splitterMode === 'end' ? 'ph--arrow-down--regular' : 'ph--arrow-up--regular'}
                  label={splitterMode === 'end' ? 'Collapse' : 'Expand'}
                  onClick={() => setSplitterMode((splitterMode) => (splitterMode === 'split' ? 'end' : 'split'))}
                />
                <Next.Button icon='ph--x--regular' label='Close' onClick={() => setSplitterMode('start')} />
              </StoryPanel>
            </Next.Splitter.Panel>
          </Next.Splitter.Root>
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
