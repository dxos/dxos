//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type EditorView } from '@codemirror/view';
import React, { useRef } from 'react';

import { withLayout, withTheme, type Meta } from '@dxos/storybook-utils';

import { EditorStory } from './components';
import { RefPopover, type SlashCommandGroup, SlashCommandMenu } from '../components';
import { useSlashMenu } from '../extensions';
import { str } from '../testing';

const groups: SlashCommandGroup[] = [
  {
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

const meta: Meta<typeof EditorStory> = {
  title: 'ui/react-ui-editor/Slash',
  decorators: [withTheme, withLayout({ fullscreen: true })],
  render: () => {
    const viewRef = useRef<EditorView>();
    const { slashMenu, groupsRef, currentItem, onSelect, ...props } = useSlashMenu(viewRef, groups);

    return (
      <RefPopover modal={false} {...props}>
        <EditorStory ref={viewRef} text={str('# Slash', '', '', '')} placeholder={''} extensions={slashMenu} />
        <SlashCommandMenu groups={groupsRef.current} currentItem={currentItem} onSelect={onSelect} />
      </RefPopover>
    );
  },
  parameters: { layout: 'fullscreen' },
};

export default meta;

export const Default = {};
