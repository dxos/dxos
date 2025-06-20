//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type EditorView } from '@codemirror/view';
import { type StoryObj } from '@storybook/react';
import React, { useRef } from 'react';

import { withLayout, withTheme, type Meta } from '@dxos/storybook-utils';

import { EditorStory, names } from './components';
import { coreSlashCommands, filterItems, RefPopover, type CommandMenuGroup, CommandMenu } from '../components';
import { useCommandMenu, type UseCommandMenuOptions } from '../extensions';
import { str } from '../testing';

type Args = Omit<UseCommandMenuOptions, 'viewRef'> & { text: string };

const Story = ({ text, ...options }: Args) => {
  const viewRef = useRef<EditorView>();
  const { commandMenu, groupsRef, currentItem, onSelect, ...props } = useCommandMenu({ viewRef, ...options });

  return (
    <RefPopover modal={false} {...props}>
      <EditorStory ref={viewRef} text={text} placeholder={''} extensions={commandMenu} />
      <CommandMenu groups={groupsRef.current} currentItem={currentItem} onSelect={onSelect} />
    </RefPopover>
  );
};

const groups: CommandMenuGroup[] = [
  coreSlashCommands,
  {
    id: 'custom',
    label: 'Custom',
    items: [
      {
        id: 'custom-1',
        label: 'Log',
        icon: 'ph--log--regular',
        onSelect: console.log,
      },
    ],
  },
];

const meta: Meta<Args> = {
  title: 'ui/react-ui-editor/CommandMenu',
  decorators: [withTheme, withLayout({ fullscreen: true })],
  render: (args) => <Story {...args} />,
  parameters: { layout: 'fullscreen' },
};

export default meta;

export const Slash: StoryObj<Args> = {
  args: {
    trigger: '/',
    getGroups: (query) =>
      filterItems(groups, (item) => (query ? item.label.toLowerCase().includes(query.toLowerCase()) : true)),
    text: str('# Slash', '', names.join(' '), ''),
  },
};
