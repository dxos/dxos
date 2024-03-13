//
// Copyright 2023 DXOS.org
//

import { Prec } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { ArrowSquareOut, Circle, DotsThreeVertical, X } from '@phosphor-icons/react';
import React, { type HTMLAttributes, StrictMode, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { Button, DensityProvider, DropdownMenu, Input, useThemeContext, useTranslation } from '@dxos/react-ui';
import {
  type CursorInfo,
  type YText, // TODO(burdon): Remove.
  useTextEditor,
  automerge,
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
  formattingKeymap,
  useDocAccessor,
} from '@dxos/react-ui-editor';
import { getSize, mx } from '@dxos/react-ui-theme';

import { getNext, getParent, getPrevious, getItems, type Item, getLastDescendent } from './types';
import { OUTLINER_PLUGIN } from '../../meta';

type CursorSelection = {
  itemId: string;
  anchor?: number;
};

type OutlinerOptions = Pick<HTMLAttributes<HTMLInputElement>, 'placeholder' | 'spellCheck'> & {
  isTasklist?: boolean;
};

const useKeymap = ({ onEnter, onIndent, onDelete, onShift, onCursor }: OutlinerItemProps) =>
  useMemo(() => {
    const getCursor = (view: EditorView): CursorInfo => {
      const { head, from, to } = view.state.selection.ranges[0];
      const { number: line } = view.state.doc.lineAt(head);
      return {
        from,
        to,
        line,
        lines: view.state.doc.lines,
        length: view.state.doc.length,
        after: view.state.sliceDoc(from),
      };
    };

    return Prec.highest(
      keymap.of([
        {
          key: 'Enter',
          run: (view) => {
            const cursor = getCursor(view);
            onEnter?.(cursor);
            return true;
          },
        },
        {
          key: 'Backspace',
          run: (view) => {
            const cursor = getCursor(view);
            const { from, line } = cursor;
            if (from === 0 && line === 1) {
              onDelete?.(cursor);
              return true;
            }

            return false;
          },
        },
        {
          key: 'Tab',
          run: () => {
            onIndent?.('right');
            return true;
          },
          shift: () => {
            onIndent?.('left');
            return true;
          },
        },

        //
        // Nav
        //
        {
          key: 'ArrowLeft',
          run: (view) => {
            const { from, line } = getCursor(view);
            if (from === 0 && line === 1) {
              onCursor?.('up', -1);
              return true;
            }

            return false;
          },
        },
        {
          key: 'ArrowRight',
          run: (view) => {
            const { from, length } = getCursor(view);
            if (from === length) {
              onCursor?.('down');
              return true;
            }

            return false;
          },
        },

        //
        // Left/right
        //
        {
          key: 'ArrowLeft',
          run: (view) => {
            const { from, line } = getCursor(view);
            if (from === 0 && line === 1) {
              onCursor?.('up', -1);
              return true;
            }

            return false;
          },
        },
        {
          key: 'ArrowRight',
          run: (view) => {
            const { from, length } = getCursor(view);
            if (from === length) {
              onCursor?.('down', 0);
              return true;
            }

            return false;
          },
        },

        //
        // Up
        //
        {
          key: 'ArrowUp',
          run: (view) => {
            const { from, line } = getCursor(view);
            if (line === 1) {
              if (from === 0) {
                onCursor?.('up', from);
              } else {
                view.dispatch({ selection: { anchor: 0 } });
              }
              return true;
            }

            return false;
          },
        },
        {
          key: 'alt-ArrowUp',
          run: () => {
            onShift?.('up');
            return true;
          },
        },
        {
          key: 'cmd-ArrowUp',
          run: () => {
            onCursor?.('home');
            return true;
          },
        },

        //
        // Down
        //
        {
          key: 'ArrowDown',
          run: (view) => {
            const { line, lines, length, from } = getCursor(view);
            if (line === lines) {
              if (from === length) {
                onCursor?.('down', from);
              } else {
                view.dispatch({ selection: { anchor: length } });
              }

              return true;
            }

            return false;
          },
        },
        {
          key: 'alt-ArrowDown',
          run: () => {
            onShift?.('down');
            return true;
          },
        },
        {
          key: 'cmd-ArrowDown',
          run: () => {
            onCursor?.('end');
            return true;
          },
        },
      ]),
    );
  }, []);

//
// Item
//

type OutlinerItemProps = {
  item: Item;
  active?: CursorSelection; // Request focus.
  onSelect?: () => void;
  onEnter?: (state?: CursorInfo) => void;
  onDelete?: (state?: CursorInfo) => void;
  onIndent?: (direction?: 'left' | 'right') => void;
  onShift?: (direction?: 'up' | 'down') => void;
  onCursor?: (direction?: 'home' | 'end' | 'up' | 'down', anchor?: number) => void;
} & OutlinerOptions;

const OutlinerItem = (props: OutlinerItemProps) => {
  const { item, active, placeholder, isTasklist, onSelect, onDelete } = props;
  const { t } = useTranslation(OUTLINER_PLUGIN);
  const { themeMode } = useThemeContext();
  const keymap = useKeymap(props);

  const [focus, setFocus] = useState(false);
  useEffect(() => {
    if (focus) {
      onSelect?.();
    }
  }, [focus]);

  const { doc, accessor } = useDocAccessor(item.text);
  const { parentRef, view } = useTextEditor(
    () => ({
      doc,
      extensions: [
        EditorView.updateListener.of(({ view }) => setFocus(view.hasFocus)),
        createBasicExtensions({ placeholder }),
        createMarkdownExtensions({ themeMode }),
        createThemeExtensions({ themeMode }),
        decorateMarkdown({ renderLinkButton: onRenderLink }),
        formattingKeymap(),
        automerge(accessor),
        keymap,
      ],
    }),
    [accessor, themeMode],
  );
  useEffect(() => {
    if (active) {
      view?.focus();
    }
  }, [view, active]);

  return (
    <div className='flex'>
      <div className='flex flex-col shrink-0 h-[40px] justify-center cursor-pointer'>
        {(isTasklist && (
          <Input.Root>
            <Input.Checkbox
              classNames='mx-2'
              checked={item.done}
              onCheckedChange={(checked) => {
                item.done = !!checked;
              }}
            />
          </Input.Root>
        )) || (
          <Circle
            weight={focus ? 'fill' : undefined}
            className={mx('mx-2 cursor-pointer', getSize(4), active && 'text-primary-500')}
            onClick={() => onSelect?.()}
          />
        )}
      </div>

      <div ref={parentRef} className='flex grow pt-1' />

      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <Button variant='ghost'>
            <DotsThreeVertical />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content>
            <DropdownMenu.Viewport>
              {onDelete && (
                <DropdownMenu.Item onClick={() => onDelete()}>
                  <X className={getSize(5)} />
                  <p>{t('delete object label')}</p>
                </DropdownMenu.Item>
              )}
            </DropdownMenu.Viewport>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
};

//
// Branch
//

type OutlinerBranchProps = OutlinerOptions & {
  className?: string;
  root: Item;
  active?: CursorSelection;
  onItemCursor?: (parent: Item, item: Item, direction?: string, anchor?: number) => void;
  onItemSelect?: (parent: Item, item: Item) => void;
  onItemCreate?: (parent: Item, item: Item, state?: CursorInfo, after?: boolean) => Item;
  onItemDelete?: (parent: Item, item: Item, state?: CursorInfo) => void;
  onItemIndent?: (parent: Item, item: Item, direction?: string) => void;
  onItemShift?: (parent: Item, item: Item, direction?: string) => void;
};

const OutlinerBranch = ({
  className,
  root,
  active,
  onItemCursor,
  onItemSelect,
  onItemCreate,
  onItemDelete,
  onItemIndent,
  onItemShift,
  ...props
}: OutlinerBranchProps) => {
  return (
    <div className={className}>
      {root.items?.map((item) => (
        <div key={item.id}>
          <OutlinerItem
            item={item}
            active={active?.itemId === item.id ? active : undefined}
            onCursor={(...args) => onItemCursor?.(root, item, ...args)}
            onSelect={() => onItemSelect?.(root, item)}
            onEnter={(...args) => onItemCreate?.(root, item, ...args)}
            onDelete={(...args) => onItemDelete?.(root, item, ...args)}
            onIndent={(...args) => onItemIndent?.(root, item, ...args)}
            onShift={(...args) => onItemShift?.(root, item, ...args)}
            {...props}
          />
          {(item.items?.length ?? 0) > 0 && (
            <OutlinerBranch
              className='pl-4'
              root={item}
              active={active}
              onItemCursor={onItemCursor}
              onItemSelect={onItemSelect}
              onItemCreate={onItemCreate}
              onItemDelete={onItemDelete}
              onItemIndent={onItemIndent}
              onItemShift={onItemShift}
              {...props}
            />
          )}
        </div>
      ))}
    </div>
  );
};

//
// Root
//

type OutlinerRootProps = {
  className?: string;
  root: Item;
  onCreate?: (text?: string) => Item;
  onDelete?: (item: Item) => void;
} & OutlinerOptions;

const OutlinerRoot = ({ className, root, onCreate, onDelete, ...props }: OutlinerRootProps) => {
  const [active, setActive] = useState<CursorSelection>();

  //
  // Create/split line.
  //
  const handleCreate: OutlinerBranchProps['onItemCreate'] = (parent, current, state) => {
    const items = getItems(parent);
    const idx = items.findIndex(({ id }) => current.id === id);

    let item: Item;
    if (state?.from === 0 && state?.after?.length) {
      // Insert before.
      item = onCreate!();
      items.splice(idx, 0, item);
    } else {
      // Insert after.
      item = onCreate!(state?.after?.trim());
      if (state?.after) {
        // Split line.
        const text = current.text!.content as YText;
        text.delete(state.from, text.length);
      }

      if (current.items?.length) {
        current.items.splice(0, 0, item);
      } else {
        items.splice(idx + 1, 0, item);
      }
    }

    setActive({ itemId: item.id });
    return item;
  };

  //
  // Delete/join line.
  //
  const handleDelete: OutlinerBranchProps['onItemDelete'] = (parent, item, state) => {
    if (parent === root && parent.items?.length === 1) {
      return;
    }

    const items = getItems(parent);
    const idx = items.findIndex(({ id }) => id === item.id);

    // Don't delete if not empty and first in list.
    if (idx === 0 && state?.after?.length) {
      return;
    }

    // Remove and add children.
    const children = item.items;
    items.splice(idx, 1);
    onDelete!(item);

    // Join to previous line.
    if (idx - 1 >= 0) {
      const active = getLastDescendent(items[idx - 1]);
      if (active) {
        const text = active.text!.content as YText;
        const from = text.length;
        if (state?.after?.length) {
          text.insert(from, state.after.trim());
        }

        setActive({ itemId: active.id, anchor: from });
        const items = getItems(active);
        items.splice(items.length, 0, ...(children ?? []));
      }
    } else {
      const text = parent.text!.content as YText;
      const from = text.length;
      setActive({ itemId: parent.id, anchor: from });
    }
  };

  //
  // Indent.
  //
  const handleIndent: OutlinerBranchProps['onItemIndent'] = (parent, item, direction) => {
    const items = getItems(parent);
    const idx = items.findIndex(({ id }) => id === item.id) ?? -1;
    switch (direction) {
      case 'left': {
        if (parent) {
          // Get parent's parent.
          const ancestor = getParent(root, parent)!;
          if (ancestor) {
            // Move all siblings.
            const move = items.splice(idx, items.length - idx);
            const ancestorItems = getItems(ancestor);
            const parentIdx = ancestorItems.findIndex(({ id }) => id === parent.id);
            ancestorItems.splice(parentIdx + 1, 0, ...move);
          }
        }
        break;
      }

      case 'right': {
        // Can't indent first child.
        if (idx > 0) {
          const siblingItems = getItems(items[idx - 1]);
          siblingItems.splice(siblingItems.length, 0, item);
          items.splice(idx, 1);
        }
        break;
      }
    }
  };

  //
  // Move lines.
  //
  const handleShift: OutlinerBranchProps['onItemShift'] = (parent, item, direction) => {
    const idx = parent.items!.findIndex(({ id }) => id === item.id) ?? -1;
    switch (direction) {
      case 'up': {
        if (idx > 0) {
          const previous = parent.items![idx - 1];
          parent.items!.splice(idx - 1, 2, item, previous);
        }
        break;
      }

      case 'down':
        if (idx < parent.items!.length - 1) {
          const next = parent.items![idx + 1];
          parent.items!.splice(idx, 2, next, item);
        }
        break;
    }
  };

  //
  // Navigation.
  //
  const handleCursor: OutlinerBranchProps['onItemCursor'] = (parent, item, direction, anchor) => {
    switch (direction) {
      case 'home': {
        setActive({ itemId: root.items![0].id, anchor: 0 });
        break;
      }

      case 'end': {
        const last = getLastDescendent(root.items![root.items!.length - 1]);
        if (last) {
          setActive({ itemId: last.id, anchor: 0 });
        }
        break;
      }

      case 'up': {
        const previous = getPrevious(root, item);
        if (previous && previous !== root) {
          setActive({ itemId: previous.id, anchor });
        }
        break;
      }

      case 'down': {
        const next = getNext(root, item);
        if (next) {
          setActive({ itemId: next.id, anchor });
        }
        break;
      }
    }
  };

  return (
    <div role='tree' className={className}>
      <DensityProvider density='fine'>
        <OutlinerBranch
          root={root}
          active={active}
          onItemCursor={handleCursor}
          onItemSelect={(root, item) => setActive({ itemId: item.id })}
          onItemCreate={onCreate && handleCreate}
          onItemDelete={onDelete && handleDelete}
          onItemIndent={handleIndent}
          onItemShift={handleShift}
          {...props}
        />
      </DensityProvider>
    </div>
  );
};

export const Outliner = {
  Root: OutlinerRoot,
  Branch: OutlinerBranch,
  Item: OutlinerItem,
};

export type { OutlinerRootProps };

// TODO(burdon): Factor out style.
const hover = 'rounded-sm text-primary-600 hover:text-primary-500 dark:text-primary-300 hover:dark:text-primary-200';

const onRenderLink = (el: Element, url: string) => {
  createRoot(el).render(
    <StrictMode>
      <a href={url} rel='noreferrer' target='_blank' className={hover}>
        <ArrowSquareOut weight='bold' className={mx(getSize(4), 'inline-block leading-none mis-1 cursor-pointer')} />
      </a>
    </StrictMode>,
  );
};
