//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type EditorView } from '@codemirror/view';
import React, { useCallback, useMemo, useRef, useState } from 'react';

import { type DxRefTag, type DxRefTagActivate } from '@dxos/lit-ui';
import { Popover, useThemeContext } from '@dxos/react-ui';
import { withLayout, withTheme, type Meta } from '@dxos/storybook-utils';

import { EditorStory } from './components';
import { RefPopover } from '../components';
import { slashLineEffect, slashMenu } from '../extensions';
import { str } from '../testing';

const items = ['test', 'text', 'heading', 'list', 'quote'];

const meta: Meta<typeof EditorStory> = {
  title: 'ui/react-ui-editor/Slash',
  decorators: [withTheme, withLayout({ fullscreen: true })],
  render: () => {
    const { tx } = useThemeContext();
    const viewRef = useRef<EditorView>(null);
    const triggerRef = useRef<DxRefTag | null>(null);
    const [open, setOpen] = useState(false);
    const [_, update] = useState({});
    const [currentItem, setCurrentItem] = useState(0);
    const currentRef = useRef<string | null>(null);
    const itemsRef = useRef<string[]>(items);

    const handleOpenChange = useCallback((open: boolean) => {
      setOpen(open);
      if (!open) {
        setCurrentItem(0);
        triggerRef.current = null;
        itemsRef.current = items;
        viewRef.current?.dispatch({ effects: [slashLineEffect.of(null)] });
      }
    }, []);

    const handleActivate = useCallback((event: DxRefTagActivate) => {
      currentRef.current = itemsRef.current[0];
      triggerRef.current = event.trigger;
      handleOpenChange(true);
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
          onEnter: (_line) => {
            const view = viewRef.current;
            const line = view?.state.doc.line(_line);
            const insert = currentRef.current;
            if (!view || !line || !insert) {
              return;
            }

            const from = line.from;
            const to = line.to;
            view.dispatch({ changes: { from, to, insert } });
          },
          onTextChange: (text) => {
            itemsRef.current = items.filter((item) => item.toLowerCase().includes(text.toLowerCase()));
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
        <Popover.Portal>
          <Popover.Content align='start' onOpenAutoFocus={(event) => event.preventDefault()}>
            <Popover.Viewport>
              <ul>
                {/* NOTE: Not using DropdownMenu because the slash menu needs to manage focus explicitly. */}
                {itemsRef.current.map((item, index) => (
                  <li
                    key={item}
                    className={tx('menu.item', 'menu__item--exotic-unfocusable', {}, [
                      currentItem === index && 'bg-hoverSurface',
                    ])}
                    tabIndex={-1}
                    onClick={() => console.log('!')}
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </Popover.Viewport>
          </Popover.Content>
        </Popover.Portal>
      </RefPopover>
    );
  },
  parameters: { layout: 'fullscreen' },
};

export default meta;

export const Default = {};
