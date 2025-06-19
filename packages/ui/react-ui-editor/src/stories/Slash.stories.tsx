//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type EditorView } from '@codemirror/view';
import React, { useCallback, useMemo, useRef, useState } from 'react';

import { type DxRefTag, type DxRefTagActivate } from '@dxos/lit-ui';
import { withLayout, withTheme, type Meta } from '@dxos/storybook-utils';

import { EditorStory } from './components';
import { RefPopover, type SlashCommandItem, SlashCommandMenu, coreSlashCommandItems } from '../components';
import { slashLineEffect, slashMenu } from '../extensions';
import { str } from '../testing';

const meta: Meta<typeof EditorStory> = {
  title: 'ui/react-ui-editor/Slash',
  decorators: [withTheme, withLayout({ fullscreen: true })],
  render: () => {
    const viewRef = useRef<EditorView>(null);
    const triggerRef = useRef<DxRefTag | null>(null);
    const [open, setOpen] = useState(false);
    const [_, update] = useState({});
    const [currentItem, setCurrentItem] = useState(0);
    const currentRef = useRef<SlashCommandItem | null>(null);
    const itemsRef = useRef<SlashCommandItem[]>(coreSlashCommandItems);

    const handleOpenChange = useCallback((open: boolean) => {
      setOpen(open);
      if (!open) {
        setCurrentItem(0);
        triggerRef.current = null;
        itemsRef.current = coreSlashCommandItems;
        viewRef.current?.dispatch({ effects: [slashLineEffect.of(null)] });
      }
    }, []);

    const handleActivate = useCallback((event: DxRefTagActivate) => {
      currentRef.current = itemsRef.current[0];
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
              const next = (currentItem + 1) % itemsRef.current.length;
              currentRef.current = itemsRef.current[next];
              return next;
            });
          },
          onArrowUp: () => {
            setCurrentItem((currentItem) => {
              const next = (currentItem - 1 + itemsRef.current.length) % itemsRef.current.length;
              currentRef.current = itemsRef.current[next];
              return next;
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
            itemsRef.current = coreSlashCommandItems.filter((item) =>
              item.label.toLowerCase().includes(text.toLowerCase()),
            );
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
        <SlashCommandMenu items={itemsRef.current} currentItem={currentItem} onSelect={handleSelect} />
      </RefPopover>
    );
  },
  parameters: { layout: 'fullscreen' },
};

export default meta;

export const Default = {};
