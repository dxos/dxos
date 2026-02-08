//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type PropsWithChildren, useEffect, useState } from 'react';

import { addEventListener, combine } from '@dxos/async';
import { Button, Icon, Input, Toolbar } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Layout } from '@dxos/react-ui-mosaic';

import { translations } from '../../translations';

import { MobileLayout, useMobileLayout } from './MobileLayout';

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

  return <div className='relative h-screen'>{children}</div>;
};

const Main = () => {
  const { keyboardOpen, drawerState, setDrawerState } = useMobileLayout('MobileLayout.Main');

  return (
    <Layout.Main toolbar>
      <Toolbar.Root>
        {drawerState === 'closed' && <Button onClick={() => setDrawerState('open')}>Open</Button>}
        <Toolbar.Separator variant='gap' />
        {keyboardOpen && (
          <div className='pli-1'>
            <Icon icon='ph--keyboard--regular' />
          </div>
        )}
      </Toolbar.Root>
      <Layout.Flex column classNames='p-1'>
        <Input.Root>
          <Input.TextInput />
        </Input.Root>
      </Layout.Flex>
    </Layout.Main>
  );
};

const Drawer = () => {
  const { setDrawerState } = useMobileLayout('MobileLayout.Drawer');

  return (
    <Layout.Main toolbar>
      <Toolbar.Root>
        <Button onClick={() => setDrawerState('closed')}>Close</Button>
      </Toolbar.Root>
      <Layout.Flex column classNames='p-1'>
        <Input.Root>
          <Input.TextInput />
        </Input.Root>
      </Layout.Flex>
    </Layout.Main>
  );
};

const DefaultStory = () => {
  return (
    <WithKeyboard>
      <MobileLayout.Root>
        <MobileLayout.Main>
          <Main />
        </MobileLayout.Main>
        <MobileLayout.Drawer>
          <Drawer />
        </MobileLayout.Drawer>
      </MobileLayout.Root>
    </WithKeyboard>
  );
};

const meta = {
  title: 'plugins/plugin-simple-layout/MobileLayout',
  component: MobileLayout.Root,
  render: DefaultStory,
  decorators: [withTheme, withLayout({ layout: 'column', classNames: 'relative' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof MobileLayout.Root>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
