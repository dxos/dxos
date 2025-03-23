//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { Prec } from '@codemirror/state';
import { type StoryObj, type Meta } from '@storybook/react';
import React, { type FC, useCallback, useEffect, useState } from 'react';

import { faker } from '@dxos/random';
import { type ThemedClassName } from '@dxos/react-ui';
import { useTextEditor, createBasicExtensions, keymap, EditorView } from '@dxos/react-ui-editor';
import { mx } from '@dxos/react-ui-theme';
import { withLayout, withTheme } from '@dxos/storybook-utils';

type Item = {
  id: string;
  text: string;
};

type ItemEditorProps = ThemedClassName<{
  item: Item;
  focus?: 'start' | 'end';
  onFocus?: (item: Item) => void;
  onNavigate?: (event: { item: Item; direction: 'previous' | 'next' }) => void;
}>;

const ItemEditor: FC<ItemEditorProps> = ({ classNames, item, focus, onFocus, onNavigate }) => {
  const { parentRef, view } = useTextEditor(
    () => ({
      initialValue: item.text,
      extensions: [
        // TODO(burdon): Show placeholder only if focused.
        createBasicExtensions({ placeholder: 'Enter text...' }),

        // Monitor focus.
        EditorView.focusChangeEffect.of((_state, focusing) => {
          if (focusing) {
            onFocus?.(item);
          }

          return null;
        }),

        // Nav.
        Prec.highest(
          keymap.of([
            {
              key: 'Tab',
              run: (view) => {
                console.log('indent++');
                return true;
              },
            },
            {
              key: 'Shift-Tab',
              run: (view) => {
                console.log('indent--');
                return true;
              },
            },
            {
              key: 'ArrowUp',
              run: (view) => {
                const { from } = view.state.selection.ranges[0];
                if (from > 0) {
                  return false;
                } else {
                  onNavigate?.({ item, direction: 'previous' });
                  return true;
                }
              },
            },
            {
              key: 'ArrowDown',
              run: (view) => {
                const { from } = view.state.selection.ranges[0];
                if (from < view.state.doc.length) {
                  return false;
                } else {
                  onNavigate?.({ item, direction: 'next' });
                  return true;
                }
              },
            },
          ]),
        ),
      ],
    }),
    [item],
  );

  useEffect(() => {
    if (view && focus) {
      view.focus();
      view.dispatch({
        selection: {
          anchor: focus === 'start' ? 0 : view.state.doc.length,
          head: focus === 'start' ? 0 : view.state.doc.length,
        },
      });
    }
  }, [view, focus]);

  return <div ref={parentRef} className={mx('w-full', classNames)} />;
};

const ItemList = () => {
  const [items] = useState<Item[]>(
    Array.from({ length: 10 }, () => ({
      id: faker.string.uuid(),
      text: faker.lorem.sentence(),
    })),
  );

  const [active, setActive] = useState<{ id: string; focus?: 'start' | 'end' } | null>(null);
  useEffect(() => {
    if (items.length > 0) {
      setActive({ id: items[0].id, focus: 'end' });
    }
  }, [items]);

  const handleNavigate = useCallback<NonNullable<ItemEditorProps['onNavigate']>>(
    ({ item, direction }) => {
      const index = items.findIndex((i) => i.id === item.id);
      switch (direction) {
        case 'previous': {
          if (index > 0) {
            // TODO(burdon): Set caret at start.
            setActive({ id: items[index - 1].id, focus: 'start' });
          }
          break;
        }
        case 'next': {
          if (index < items.length - 1) {
            // TODO(burdon): Set caret at end.
            setActive({ id: items[index + 1].id, focus: 'end' });
          }
          break;
        }
      }
    },
    [items],
  );

  return (
    <div className='flex flex-col grow overflow-hidden'>
      <div className='flex flex-col grow'>
        <div className='flex flex-col overflow-y-auto'>
          {items.map((item) => (
            <ItemEditor
              key={item.id}
              classNames='p-1'
              item={item}
              focus={active?.id === item.id ? active.focus : undefined}
              onFocus={(item) => setActive({ id: item.id })}
              onNavigate={handleNavigate}
            />
          ))}
        </div>
      </div>
      <div className='flex shrink-0 items-center text-xs text-subdued'>{active?.id}</div>
    </div>
  );
};

const meta: Meta<typeof ItemList> = {
  title: 'plugins/plugin-outliner/Tasks',
  render: () => {
    return (
      <div className='flex flex-col w-[40rem] h-full bg-modalSurface'>
        <ItemList />
      </div>
    );
  },
  decorators: [withTheme, withLayout({ fullscreen: true, classNames: 'flex justify-center bg-baseSurface' })],
};

export default meta;

type Story = StoryObj<typeof ItemList>;

export const Default: Story = {};
