//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { Prec } from '@codemirror/state';
import { type StoryObj, type Meta } from '@storybook/react';
import React, { type FC, useCallback, useEffect, useRef, useState } from 'react';

import { faker } from '@dxos/random';
import { IconButton, Input, useId, useThemeContext, useTranslation, type ThemedClassName } from '@dxos/react-ui';
import { createThemeExtensions, useTextEditor, createBasicExtensions, keymap, EditorView } from '@dxos/react-ui-editor';
import { mx } from '@dxos/react-ui-theme';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { OUTLINER_PLUGIN } from '../../meta';
import translations from '../../translations';

type Item = {
  id: string;
  text: string;
};

// TODO(burdon): Indent (Task graph).
// TODO(burdon): Create/delete.

type ItemEditorProps = ThemedClassName<{
  item: Item;
  focus?: 'start' | 'end';
  onFocus?: (item: Item) => void;
  onNavigate?: (event: { item: Item; direction: 'previous' | 'next' }) => void;
  onDelete?: (item: Item) => void;
  onCreate?: () => void;
}>;

const ItemEditor: FC<ItemEditorProps> = ({ classNames, item, focus, onFocus, onNavigate, onDelete, onCreate }) => {
  const { t } = useTranslation(OUTLINER_PLUGIN);
  const [focused, setFocused] = useState<boolean>(false);
  const { themeMode } = useThemeContext();
  const id = useId('item_enditor', item.id);

  const { parentRef, view } = useTextEditor(
    () => ({
      initialValue: item.text,
      extensions: [
        // TODO(burdon): Show placeholder only if focused.
        createBasicExtensions({ placeholder: 'Enter text...' }),
        createThemeExtensions({ themeMode }),

        // Monitor focus.
        EditorView.focusChangeEffect.of((_state, focusing) => {
          setFocused(focusing);
          if (focusing) {
            onFocus?.(item);
          }

          return null;
        }),

        // Nav.
        Prec.highest(
          keymap.of([
            {
              key: 'Enter',
              run: () => {
                onCreate?.();
                return true;
              },
            },
            {
              key: 'Shift-Enter',
              run: (view) => {
                view.dispatch(view.state.replaceSelection('\n'));
                return true;
              },
            },
            {
              key: 'Tab',
              run: (view) => {
                return true;
              },
            },
            {
              key: 'Shift-Tab',
              run: (view) => {
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

  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (view && focus) {
      view.focus();
      const anchor = focus === 'start' ? 0 : view.state.doc.length;
      view.dispatch({
        selection: {
          anchor,
        },
      });
      rootRef.current?.scrollIntoView({ behavior: 'instant', block: 'nearest' });
    }
  }, [view, focus]);

  return (
    <div id={id} className={mx('flex w-full gap-1', classNames)} ref={rootRef}>
      <div className='px-2 pt-[3px]'>
        <Input.Root>
          <Input.Checkbox size={4} />
        </Input.Root>
      </div>

      <div ref={parentRef} className='w-full pbs-1' />

      {onDelete && (
        <div>
          <IconButton
            classNames={mx('opacity-20 hover:opacity-100', focused && 'opacity-100')}
            icon='ph--x--regular'
            iconOnly
            variant='ghost'
            label={t('delete button')}
            onClick={() => onDelete(item)}
          />
        </div>
      )}
    </div>
  );
};

const ItemList = () => {
  const [items, setItems] = useState<Item[]>(
    Array.from({ length: 50 }, () => ({
      id: faker.string.uuid(),
      text: faker.lorem.sentences(1),
    })),
  );

  // TODO(burdon): Scroll item into view.
  const [active, setActive] = useState<{ id: string; focus?: 'start' | 'end' } | null>(null);
  useEffect(() => {
    if (items.length > 0) {
      setActive({ id: items[0].id, focus: 'end' });
    }
  }, [items]);

  const scrollRef = useRef<HTMLDivElement>(null);

  const handleNavigate = useCallback<NonNullable<ItemEditorProps['onNavigate']>>(
    ({ item, direction }) => {
      const index = items.findIndex((i) => i.id === item.id);
      switch (direction) {
        case 'previous': {
          if (index > 0) {
            setActive({ id: items[index - 1].id, focus: 'start' });
          }
          break;
        }
        case 'next': {
          if (index < items.length - 1) {
            setActive({ id: items[index + 1].id, focus: 'end' });
          }
          break;
        }
      }
    },
    [items],
  );

  const handleDelete = useCallback<NonNullable<ItemEditorProps['onDelete']>>(
    (item) => {
      setItems(items.filter((i) => i.id !== item.id));
    },
    [items],
  );

  // TODO(burdon): Grid?
  return (
    <div className='flex flex-col grow overflow-hidden'>
      <div className='flex flex-col grow overflow-hidden'>
        <div ref={scrollRef} className='flex flex-col overflow-y-auto scrollbar-thin'>
          {items.map((item) => (
            <ItemEditor
              key={item.id}
              item={item}
              focus={active?.id === item.id ? active.focus : undefined}
              onFocus={(item) => setActive({ id: item.id })}
              onNavigate={handleNavigate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      </div>
      {/* Statusbar */}
      <div className='flex shrink-0 h-[40px] p-1 justify-center items-center text-xs text-subdued'>{active?.id}</div>
    </div>
  );
};

const meta: Meta<typeof ItemList> = {
  title: 'plugins/plugin-outliner/Tasks',
  render: () => {
    return (
      <div className='flex flex-col w-[40rem] h-full overflow-hidden bg-modalSurface'>
        <ItemList />
      </div>
    );
  },
  decorators: [
    withTheme,
    withLayout({ fullscreen: true, tooltips: true, classNames: 'flex justify-center bg-baseSurface' }),
  ],
  parameters: {
    translations,
  },
};

export default meta;

type Story = StoryObj<typeof ItemList>;

export const Default: Story = {};
