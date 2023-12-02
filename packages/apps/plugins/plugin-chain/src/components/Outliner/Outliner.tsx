//
// Copyright 2023 DXOS.org
//

import { DotsThreeVertical, DotOutline, X } from '@phosphor-icons/react';
import React, { type HTMLAttributes, useEffect, useRef, useState } from 'react';

import { Button, DensityProvider, DropdownMenu, Input, useTranslation } from '@dxos/react-ui';
import { useTextModel, type YText } from '@dxos/react-ui-editor';
import { getSize, mx } from '@dxos/react-ui-theme';

import { getNext, getParent, getPrevious, getItems, type Item, getLastDescendent } from './types';
import { CHAIN_PLUGIN } from '../../meta';
import { type CursorInfo, TextEditor, type TextEditorProps, type TextEditorRef } from '../TextEditor';

type ChainOptions = Pick<HTMLAttributes<HTMLInputElement>, 'placeholder' | 'spellCheck'> & {
  isTasklist?: boolean;
};

//
// Item
//

type CursorSelection = {
  itemId: string;
  from?: number;
  to?: number;
};

type ChainItemProps = {
  item: Item;
  active?: CursorSelection; // Request focus.
  onSelect?: () => void;
  onEnter?: (state?: CursorInfo) => void;
  onDelete?: (state?: CursorInfo) => void;
  onIndent?: (direction?: 'left' | 'right') => void;
  onShift?: (direction?: 'up' | 'down') => void;
  onCursor?: (direction?: 'home' | 'end' | 'up' | 'down', pos?: number) => void;
} & ChainOptions;

const ChainItem = ({
  item,
  active,
  isTasklist,
  placeholder,
  onSelect,
  onEnter,
  onDelete,
  onIndent,
  onShift,
  onCursor,
}: ChainItemProps) => {
  const { t } = useTranslation(CHAIN_PLUGIN);
  const model = useTextModel({ text: item.text });
  const [focus, setFocus] = useState<boolean>();
  useEffect(() => {
    if (focus) {
      onSelect?.();
    }
  }, [focus]);

  const ref = useRef<TextEditorRef>(null);
  useEffect(() => {
    if (ref.current && active && !focus) {
      // TODO(burdon): Hack since ref isn't instantiated yet.
      //  NOTE: This happens with the line is split and a new line is created and set as the active line.
      setTimeout(() => {
        ref.current?.view?.focus();
        const from = active.from === -1 ? ref.current?.view?.state.doc.length : active.from;
        if (from !== undefined) {
          ref.current?.view?.dispatch({ selection: { anchor: from, head: active.to ?? from } });
        }
      });
    }
  }, [ref.current?.view, active]);

  const handleKeyDown: TextEditorProps['onKeyDown'] = (event, state) => {
    const { key, shiftKey } = event;
    const { from, to, line, lines, after } = state;
    switch (key) {
      // TODO(burdon): Only move lines if at start/end of line.
      case 'ArrowUp':
        if (event.altKey) {
          event.preventDefault();
          onShift?.('up');
        } else {
          if (line === 1) {
            event.preventDefault();
            onCursor?.(event.metaKey ? 'home' : 'up');
          }
        }
        break;
      case 'ArrowDown':
        if (event.altKey) {
          event.preventDefault();
          onShift?.('down');
        } else {
          if (line === lines) {
            event.preventDefault();
            onCursor?.(event.metaKey ? 'end' : 'down');
          }
        }
        break;
      case 'ArrowLeft': {
        if (from === 0) {
          event.preventDefault();
          onCursor?.('up', -1);
        }
        break;
      }
      case 'ArrowRight': {
        console.log(from, to);
        if (!after?.length) {
          event.preventDefault();
          onCursor?.('down', 0);
        }
        break;
      }
      case 'Tab': {
        event.preventDefault();
        onIndent?.(event.shiftKey ? 'left' : 'right');
        break;
      }
      case 'Enter': {
        if (!shiftKey) {
          event.preventDefault();
          onEnter?.(state);
        }
        break;
      }
      case 'Backspace': {
        if (from === 0 && line === 1) {
          event.preventDefault();
          onDelete?.(state);
        }
        break;
      }
    }
  };

  return (
    <div className='flex px-2 group'>
      {(isTasklist && (
        <div className='py-1 mr-1'>
          <Input.Root>
            <Input.Checkbox
              checked={item.done}
              onCheckedChange={(checked) => {
                item.done = !!checked;
              }}
            />
          </Input.Root>
        </div>
      )) || (
        <div className='px-1 py-1 cursor-pointer' title={item.id.slice(0, 8)} onClick={() => onSelect?.()}>
          <DotOutline
            weight={focus ? 'fill' : undefined}
            className={mx('shrink-0', getSize(6), active && 'text-primary-500')}
          />
        </div>
      )}

      {model && (
        <TextEditor
          ref={ref}
          model={model}
          slots={{
            root: {
              className: 'w-full',
            },
            editor: {
              placeholder,
            },
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
        />
      )}

      <div>
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
    </div>
  );
};

//
// Branch
//

type ChainBranchProps = ChainOptions & {
  className?: string;
  root: Item;
  active?: CursorSelection;
  onItemCursor?: (parent: Item, item: Item, direction?: string, pos?: number) => void;
  onItemSelect?: (parent: Item, item: Item) => void;
  onItemCreate?: (parent: Item, item: Item, state?: CursorInfo, after?: boolean) => Item;
  onItemDelete?: (parent: Item, item: Item, state?: CursorInfo) => void;
  onItemIndent?: (parent: Item, item: Item, direction?: string) => void;
  onItemShift?: (parent: Item, item: Item, direction?: string) => void;
};

const ChainBranch = ({
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
}: ChainBranchProps) => {
  return (
    <div className={className}>
      {root.items?.map((item) => (
        <div key={item.id}>
          <ChainItem
            item={item}
            active={active?.itemId === item.id ? active : undefined}
            placeholder='Enter text'
            onCursor={(...args) => onItemCursor?.(root, item, ...args)}
            onSelect={() => onItemSelect?.(root, item)}
            onEnter={(...args) => onItemCreate?.(root, item, ...args)}
            onDelete={(...args) => onItemDelete?.(root, item, ...args)}
            onIndent={(...args) => onItemIndent?.(root, item, ...args)}
            onShift={(...args) => onItemShift?.(root, item, ...args)}
            {...props}
          />
          {(item.items?.length ?? 0) > 0 && (
            <ChainBranch
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

type ChainRootProps = {
  className?: string;
  root: Item;
  onCreate?: (text?: string) => Item;
  onDelete?: (item: Item) => void;
} & ChainOptions;

const ChainRoot = ({ className, root, onCreate, onDelete, ...props }: ChainRootProps) => {
  const [active, setActive] = useState<CursorSelection>();

  // TODO(burdon): [BUG]: New item is created while current editor has focus.
  //  In storybooks, if typing quickly the text following ENTER will be in the old item.
  const handleCreate: ChainBranchProps['onItemCreate'] = (parent, current, state) => {
    const items = getItems(parent);
    const idx = items.findIndex(({ id }) => current.id === id);

    let item: Item;
    if (state?.from === 0) {
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

  const handleDelete: ChainBranchProps['onItemDelete'] = (parent, item, state) => {
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

        setActive({ itemId: active.id, from });
        const items = getItems(active);
        items.splice(items.length, 0, ...(children ?? []));
      }
    } else {
      const text = parent.text!.content as YText;
      const from = text.length;
      setActive({ itemId: parent.id, from });
    }
  };

  const handleIndent: ChainBranchProps['onItemIndent'] = (parent, item, direction) => {
    const items = getItems(parent);
    const idx = items.findIndex(({ id }) => id === item.id) ?? -1;
    switch (direction) {
      case 'left': {
        if (parent) {
          // Move all siblings.
          const move = items.splice(idx, items.length - idx);

          // Get parent's parent.
          const ancestor = getParent(root, parent)!;
          const ancestorItems = getItems(ancestor);
          const parentIdx = ancestorItems.findIndex(({ id }) => id === parent.id);
          ancestorItems.splice(parentIdx + 1, 0, ...move);
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

  const handleShift: ChainBranchProps['onItemShift'] = (parent, item, direction) => {
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

  const handleCursor: ChainBranchProps['onItemCursor'] = (parent, item, direction, pos) => {
    switch (direction) {
      case 'home': {
        setActive({ itemId: root.items![0].id, from: 0 });
        break;
      }
      case 'end': {
        const last = getLastDescendent(root.items![root.items!.length - 1]);
        if (last) {
          setActive({ itemId: last.id, from: 0 });
        }
        break;
      }
      case 'up': {
        const previous = getPrevious(root, item);
        if (previous) {
          setActive({ itemId: previous.id, from: pos });
        }
        break;
      }
      case 'down': {
        const next = getNext(root, item);
        if (next) {
          setActive({ itemId: next.id, from: pos });
        }
        break;
      }
    }
  };

  return (
    <div role='tree' className={className}>
      <DensityProvider density='fine'>
        <ChainBranch
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

export const Chain = {
  Root: ChainRoot,
  Branch: ChainBranch,
  Item: ChainItem,
};

export type { ChainRootProps };
