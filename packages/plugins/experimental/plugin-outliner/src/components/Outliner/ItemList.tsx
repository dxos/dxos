//
// Copyright 2025 DXOS.org
//

import { Prec } from '@codemirror/state';
import React, { type FC, forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';

import { IconButton, Input, useId, useThemeContext, useTranslation, type ThemedClassName } from '@dxos/react-ui';
import { createThemeExtensions, useTextEditor, createBasicExtensions, keymap, EditorView } from '@dxos/react-ui-editor';
import { mx } from '@dxos/react-ui-theme';

import { OUTLINER_PLUGIN } from '../../meta';
import { type TreeItemType } from '../../types';

// TODO(burdon): Indent (Task graph).
// TODO(burdon): Create/delete.

//
// Editor.
//

type ItemEditorView = {
  focus: (at?: 'start' | 'end') => void;
};

type ItemEditorProps = ThemedClassName<
  {
    item: TreeItemType;
    onFocus?: (item: TreeItemType) => void;
    onNavigate?: (event: { item: TreeItemType; direction: 'previous' | 'next' }) => void;
  } & Pick<ItemListProps, 'onCreate' | 'onDelete'>
>;

const ItemEditor = forwardRef<ItemEditorView, ItemEditorProps>(
  ({ classNames, item, onFocus, onNavigate, onCreate, onDelete }, ref) => {
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

          // Key bindings.
          Prec.highest(
            keymap.of([
              {
                key: 'Backspace',
                run: (view) => {
                  if (view.state.doc.length) {
                    return false;
                  } else {
                    onDelete?.(item);
                    return true;
                  }
                },
              },
              {
                key: 'Enter',
                run: () => {
                  onCreate?.(item);
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
              //
              // Indent.
              //
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
              //
              // Navigate.
              //
              {
                key: 'ArrowLeft',
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
                key: 'ArrowRight',
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

    // Controller.
    const div = useRef<HTMLDivElement>(null);
    useImperativeHandle(
      ref,
      () => {
        return {
          focus: (at) => {
            if (view) {
              view.focus();
              const anchor = at === 'start' ? 0 : view.state.doc.length;
              view.dispatch({
                selection: {
                  anchor,
                },
              });
              div.current?.scrollIntoView({ behavior: 'instant', block: 'nearest' });
            }
          },
        };
      },
      [view],
    );

    return (
      <div id={id} className={mx('flex w-full gap-1', classNames)} ref={div}>
        <div className='px-2 pt-[3px]'>
          <Input.Root>
            <Input.Checkbox size={4} title={item.id} />
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
  },
);

//
// List.
//

type ItemListProps = ThemedClassName<{
  items: TreeItemType[];
  selected?: string;
  onSelect?: (id: string) => void;
  onCreate?: (previous: TreeItemType, text?: string) => void;
  onDelete?: (item: TreeItemType) => void;
}>;

const ItemList: FC<ItemListProps> = ({ classNames, items, selected, onSelect, onCreate, onDelete }) => {
  // TODO(burdon): Scroll item into view.
  const scrollRef = useRef<HTMLDivElement>(null);

  const [editor, setEditor] = useState<ItemEditorView | null>(null);
  const [direction, setDirection] = useState<'start' | 'end'>();
  useEffect(() => {
    editor?.focus(direction);
  }, [editor, selected, direction]);

  const itemsRef = useRef<TreeItemType[]>(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const handleNavigate = useCallback<NonNullable<ItemEditorProps['onNavigate']>>(
    ({ item, direction }) => {
      const items = itemsRef.current;
      const index = items.findIndex((i) => i.id === item.id);
      switch (direction) {
        case 'previous': {
          if (index > 0) {
            const id = items[index - 1].id;
            onSelect?.(id);
            setDirection('start');
          }
          break;
        }
        case 'next': {
          if (index < items.length - 1) {
            const id = items[index + 1].id;
            onSelect?.(id);
            setDirection('end');
          }
          break;
        }
      }
    },
    [items],
  );

  const handleDelete = useCallback<NonNullable<ItemEditorProps['onDelete']>>(
    (item) => {
      // Only navigate if deleting the current item.
      const items = itemsRef.current;
      let index = items.findIndex((i) => i.id === item.id);
      if (selected === item.id) {
        if (index === 0) {
          index++;
        } else {
          index--;
        }
      } else {
        // TODO(burdon): Curently fails to preserve selection.
        index = items.findIndex((i) => i.id === selected);
      }

      if (items.length >= index) {
        const next = items[index];
        onSelect?.(next.id);
      }

      onDelete?.(item);
    },
    [selected, onDelete],
  );

  // TODO(burdon): Grid?
  return (
    <div className={mx('flex flex-col grow overflow-hidden', classNames)}>
      <div className='flex flex-col grow overflow-hidden'>
        <div ref={scrollRef} className='flex flex-col overflow-y-auto scrollbar-thin'>
          {items.map((item) => (
            <ItemEditor
              key={item.id}
              ref={item.id === selected ? setEditor : null}
              classNames={mx(item.id === selected ? 'bg-hoverSurface' : 'text-subdued', 'hover:bg-hoverSurface')}
              item={item}
              onFocus={(item) => onSelect?.(item.id)}
              onNavigate={handleNavigate}
              onCreate={onCreate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      </div>
      {/* Statusbar */}
      <div className='flex shrink-0 h-[40px] p-1 justify-center items-center text-xs text-subdued'>{selected}</div>
    </div>
  );
};

export const Item = {
  List: ItemList,
  Editor: ItemEditor,
};

export type { ItemListProps, ItemEditorProps };
