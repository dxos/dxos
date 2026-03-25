//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type PropsWithChildren, useEffect, useState } from 'react';

import { addEventListener, combine } from '@dxos/async';
import { Column, Flex, Input, Panel, Splitter, type SplitterMode, Toolbar } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { MobileLayout, type MobileLayoutRootProps } from './MobileLayout';

/**
 * Simulate ios keyboard.
 */
const WithKeyboard = ({ children }: PropsWithChildren) => {
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    return combine(
      addEventListener(document, 'focusin', (event: FocusEvent) => {
        const target = event.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          setKeyboardOpen(true);
        }
      }),
      addEventListener(document, 'focusout', (event: FocusEvent) => {
        const target = event.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          setKeyboardOpen(false);
        }
      }),
    );
  }, []);

  useEffect(() => {
    const keyboardHeight = keyboardOpen ? 300 : 0;
    document.documentElement.style.setProperty('--kb-height', `${keyboardHeight}px`);
    document.documentElement.style.setProperty('--kb-open', keyboardOpen ? '1' : '0');

    // Dispatch custom keyboard event that useIOSKeyboard listens for.
    window.dispatchEvent(
      new CustomEvent('keyboard', {
        detail: {
          type: keyboardOpen ? 'show' : 'hide',
          height: keyboardHeight,
          duration: 300,
        },
      }),
    );
  }, [keyboardOpen]);

  return <div className='h-screen relative'>{children}</div>;
};

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
        <Column.Root gutter='xs'>
          <Column.Content>
            <Flex column classNames='p-1'>
              <Input.Root>
                <Input.TextInput placeholder={label} />
              </Input.Root>
            </Flex>
          </Column.Content>
        </Column.Root>
      </Panel.Content>
    </Panel.Root>
  );
};

const DefaultStory = () => {
  const [splitterMode, setSplitterMode] = useState<SplitterMode>('upper');
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    setSplitterMode(splitterMode === 'both' ? 'lower' : splitterMode);
  }, [keyboardOpen]);

  return (
    <WithKeyboard>
      <MobileLayout.Root onKeyboardOpenChange={setKeyboardOpen}>
        <MobileLayout.Panel safe={{ top: true, bottom: splitterMode === 'upper' }}>
          <Splitter.Root mode={splitterMode} ratio={0.5}>
            <Splitter.Panel position='upper'>
              <StoryPanel label='Main'>
                {splitterMode === 'upper' && (
                  <Toolbar.IconButton icon='ph--plus--regular' label='Open' onClick={() => setSplitterMode('both')} />
                )}
              </StoryPanel>
            </Splitter.Panel>
            <Splitter.Panel position='lower'>
              <StoryPanel label='Drawer'>
                <Toolbar.IconButton
                  icon={splitterMode === 'lower' ? 'ph--arrow-down--regular' : 'ph--arrow-up--regular'}
                  label={splitterMode === 'lower' ? 'Collapse' : 'Expand'}
                  onClick={() => setSplitterMode((splitterMode) => (splitterMode === 'both' ? 'lower' : 'both'))}
                />
                <Toolbar.IconButton icon='ph--x--regular' label='Close' onClick={() => setSplitterMode('upper')} />
              </StoryPanel>
            </Splitter.Panel>
          </Splitter.Root>
        </MobileLayout.Panel>
      </MobileLayout.Root>
    </WithKeyboard>
  );
};

const meta: Meta<MobileLayoutRootProps> = {
  title: 'plugins/plugin-simple-layout/components/MobileLayout',
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
