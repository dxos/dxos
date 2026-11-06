//
// Copyright 2026 DXOS.org
//

import '@dxos-theme';
import '../styles/island-base.generated.css';

import React, { useMemo } from 'react';

import '@dxos/react-ui/theme.css';
import { Button, Icon, Input, Menu, Panel, Theme, Toolbar } from '@dxos/react-ui';
import { Editor } from '@dxos/react-ui-editor';
import {
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
} from '@dxos/ui-editor';

const initialValue = ['# Groceries', '', 'Ask about the **oat milk**.', '', '- [ ] Eggs', '- [x] Bread', ''].join('\n');

export const Spike = () => {
  const extensions = useMemo(
    () => [
      createBasicExtensions(),
      createThemeExtensions({ themeMode: 'dark' }),
      createMarkdownExtensions(),
      decorateMarkdown(),
    ],
    [],
  );

  return (
    <Theme.Provider themeMode='dark'>
      <Panel.Root classNames='h-96 border border-separator rounded-md overflow-hidden'>
        <Panel.Header>
          <Toolbar.Root>
            <Menu.Root>
              <Menu.Trigger asChild>
                <Button.Root>Peers</Button.Root>
              </Menu.Trigger>
              <Menu.Content>
                <Menu.Item item={{ value: 'one', label: 'One up', icon: 'ph--square--regular' }} />
                <Menu.Item item={{ value: 'two', label: 'Two up', icon: 'ph--columns--regular' }} />
              </Menu.Content>
            </Menu.Root>
            <Input.Root
              placeholder='Search'
              aria-label='Search'
              end={<Icon.Icon icon='ph--magnifying-glass--regular' />}
            />
            <Button.Root icon='ph--wifi-high--regular' label='Online' iconOnly />
          </Toolbar.Root>
        </Panel.Header>
        <Panel.Body>
          <Editor.Root>
            <Editor.View initialValue={initialValue} extensions={extensions} />
          </Editor.Root>
        </Panel.Body>
      </Panel.Root>
    </Theme.Provider>
  );
};
