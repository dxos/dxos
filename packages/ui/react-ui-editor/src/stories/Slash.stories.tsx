//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type EditorView } from '@codemirror/view';
import React, { useCallback, useMemo, useRef, useState } from 'react';

import { type DxRefTag, type DxRefTagActivate } from '@dxos/lit-ui';
import { withLayout, withTheme, type Meta } from '@dxos/storybook-utils';

import { EditorStory } from './components';
import {
  RefPopover,
  type SlashCommandGroup,
  type SlashCommandItem,
  SlashCommandMenu,
  coreSlashCommands,
  filterItems,
  getItem,
  getNextItem,
  getPreviousItem,
} from '../components';
import { slashLineEffect, slashMenu } from '../extensions';
import { str } from '../testing';

const groups: SlashCommandGroup[] = [
  coreSlashCommands,
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
    const viewRef = useRef<EditorView>(null);
    const triggerRef = useRef<DxRefTag | null>(null);
    const [open, setOpen] = useState(false);
    const [_, update] = useState({});
    const [currentItem, setCurrentItem] = useState(coreSlashCommands.items[0].id);
    const currentRef = useRef<SlashCommandItem | null>(null);
    const groupsRef = useRef<SlashCommandGroup[]>(groups);

    const handleOpenChange = useCallback((open: boolean) => {
      setOpen(open);
      if (!open) {
        setCurrentItem(coreSlashCommands.items[0].id);
        triggerRef.current = null;
        groupsRef.current = groups;
        viewRef.current?.dispatch({ effects: [slashLineEffect.of(null)] });
      }
    }, []);

    const handleActivate = useCallback((event: DxRefTagActivate) => {
      const item = getItem(groupsRef.current, currentItem);
      if (item) {
        currentRef.current = item;
      }

      triggerRef.current = event.trigger;
      handleOpenChange(true);
    }, []);

    const handleSelect = useCallback((item: SlashCommandItem) => {
      const view = viewRef.current;
      if (!view) {
        return;
      }

      const selection = view.state.selection.main;
      const line = view.state.doc.lineAt(selection.head);
      void item.onSelect?.(view, line);
    }, []);

    const extensions = useMemo(
      () => [
        slashMenu({
          onArrowDown: () => {
            setCurrentItem((currentItem) => {
              const next = getNextItem(groupsRef.current, currentItem);
              currentRef.current = next;
              return next.id;
            });
          },
          onArrowUp: () => {
            setCurrentItem((currentItem) => {
              const previous = getPreviousItem(groupsRef.current, currentItem);
              currentRef.current = previous;
              return previous.id;
            });
          },
          onDeactivate: () => {
            handleOpenChange(false);
          },
          onEnter: () => {
            if (currentRef.current) {
              handleSelect(currentRef.current);
            }
          },
          onTextChange: (text) => {
            groupsRef.current = filterItems(groups, (item) => item.label.toLowerCase().includes(text.toLowerCase()));
            update({});
          },
        }),
      ],
      [handleOpenChange],
    );

    return (
      <RefPopover
        ref={triggerRef}
        modal={false}
        open={open}
        onOpenChange={handleOpenChange}
        onActivate={handleActivate}
      >
        <EditorStory ref={viewRef} text={str('# Slash', '', '', '')} placeholder={''} extensions={extensions} />
        <SlashCommandMenu groups={groupsRef.current} currentItem={currentItem} onSelect={handleSelect} />
      </RefPopover>
    );
  },
  parameters: { layout: 'fullscreen' },
};

export default meta;

export const Default = {};
