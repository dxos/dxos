//
// Copyright 2023 DXOS.org
//

import { Square, DotsThreeVertical, X } from '@phosphor-icons/react';
import React, { type HTMLAttributes, type KeyboardEvent, useEffect, useRef, useState } from 'react';

import { Button, DropdownMenu, Input, useTranslation } from '@dxos/react-ui';
import { getSize, mx } from '@dxos/react-ui-theme';

import { getNext, getParent, getPrevious, getItems, type Item, getLastDescendent } from './types';
import { OUTLINER_PLUGIN } from '../../meta';

// TODO(burdon): Break/join lines.
// TODO(burdon): TextObject/MarkdownEditor
// TODO(burdon): Cut-and-Paste.
// TODO(burdon): Drag-and-drop.
// TODO(burdon): Better key nav.

type OutlinerOptions = Pick<HTMLAttributes<HTMLInputElement>, 'placeholder' | 'spellCheck'> & {
  isTasklist?: boolean;
};

//
// Item
//

type ItemProps = {
  item: Item;
  active?: boolean;
  onFocus?: () => void;
  onEnter?: (before?: boolean) => void;
  onDelete?: () => void;
  onIndent?: (left?: boolean) => void;
  onNav?: (item: Item, direction?: 'home' | 'end' | 'up' | 'down') => void;
} & OutlinerOptions;

const Item = ({
  item,
  active,
  isTasklist,
  placeholder,
  spellCheck = false,
  onFocus,
  onEnter,
  onDelete,
  onIndent,
  onNav,
}: ItemProps) => {
  const { t } = useTranslation(OUTLINER_PLUGIN);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (active) {
      inputRef.current?.focus();
    }
  }, [active]);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case 'ArrowUp':
        // TODO(burdon): Maintain caret position.
        // TODO(burdon): Go to first/last child of group.
        onNav?.(item, event.shiftKey ? 'home' : 'up');
        break;
      case 'ArrowDown':
        onNav?.(item, event.shiftKey ? 'end' : 'down');
        break;
      case 'Tab':
        event.preventDefault();
        onIndent?.(event.shiftKey);
        break;
      case 'Enter':
        // TODO(burdon): Split line (shift to create new).
        onEnter?.(!!item.text?.length && inputRef.current?.selectionStart === 0);
        break;
      case 'Backspace':
        // TODO(burdon): Merge with previous if caret at start.
        if (!item.text?.length) {
          event.preventDefault();
          onDelete?.();
        }
        break;
      case 'Escape':
        // TODO(burdon): Toggle checkbox?
        break;
    }
  };

  return (
    <div className='flex items-center px-2 gap-3'>
      {(isTasklist && (
        <Input.Root>
          <Input.Checkbox
            checked={item.done}
            onCheckedChange={(checked) => {
              item.done = !!checked;
            }}
          />
        </Input.Root>
      )) || (
        <Square
          weight={active ? 'fill' : undefined}
          className={mx('shrink-0', getSize(2), active && 'text-primary-500')}
        />
      )}
      <Input.Root>
        <Input.TextInput
          ref={inputRef}
          // autoFocus={active}
          autoComplete='off'
          spellCheck={spellCheck}
          placeholder={focused ? placeholder : undefined}
          classNames='w-full'
          variant='subdued'
          value={item.text ?? ''}
          onFocus={() => {
            setFocused(true);
            onFocus?.();
          }}
          onBlur={() => setFocused(false)}
          onKeyDown={handleKeyDown}
          onChange={({ target: { value } }) => {
            item.text = value;
          }}
        />
      </Input.Root>
      {active && (
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
                  <DropdownMenu.Item onClick={onDelete}>
                    <X className={getSize(5)} />
                    <p>{t('delete object label')}</p>
                  </DropdownMenu.Item>
                )}
              </DropdownMenu.Viewport>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      )}
    </div>
  );
};

//
// Branch
//

type BranchProps = OutlinerOptions & {
  className?: string;
  root: Item;
  active?: string;
  onItemFocus?: (item: Item) => void;
  onItemCreate?: (parent: Item, item: Item, after?: boolean) => Item;
  onItemDelete?: (parent: Item, item: Item) => void;
  onItemIndent?: (parent: Item, item: Item, left?: boolean) => void;
} & Pick<ItemProps, 'onNav'>;

const Branch = ({
  className,
  root,
  active,
  onItemFocus,
  onItemCreate,
  onItemDelete,
  onItemIndent,
  onNav,
  ...props
}: BranchProps) => {
  return (
    <div className={className}>
      {root.items?.map((item) => (
        <div key={item.id}>
          <Item
            item={item}
            active={active === item.id}
            placeholder='Enter text'
            onFocus={() => onItemFocus?.(item)}
            onEnter={(before) => onItemCreate?.(root, item, before)}
            onDelete={() => onItemDelete?.(root, item)}
            onIndent={(left) => onItemIndent?.(root, item, left)}
            onNav={onNav}
            {...props}
          />
          {(item.items?.length ?? 0) > 0 && (
            <Branch
              className='pl-4'
              root={item}
              active={active}
              onItemFocus={onItemFocus}
              onItemCreate={onItemCreate}
              onItemDelete={onItemDelete}
              onItemIndent={onItemIndent}
              onNav={onNav}
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

type RootProps = {
  root: Item;
  onCreate?: () => Item;
  onDelete?: (item: Item) => void;
} & OutlinerOptions;

const Root = ({ root, onCreate, onDelete, ...props }: RootProps) => {
  const [active, setActive] = useState<string>();

  const handleCreate: BranchProps['onItemCreate'] = (parent, current, before) => {
    const item = onCreate!();
    const items = getItems(parent);
    const idx = items.findIndex(({ id }) => current.id === id);
    if (before) {
      items.splice(idx, 0, item);
    } else {
      if (current.items?.length) {
        current.items.splice(0, 0, item);
      } else {
        items.splice(idx + 1, 0, item);
      }
    }

    setActive(item.id);
    return item;
  };

  const handleDelete: BranchProps['onItemDelete'] = (parent, item) => {
    if (parent === root && parent.items?.length === 1) {
      return;
    }

    const items = getItems(parent);
    const idx = items.findIndex(({ id }) => id === item.id);
    onDelete!(item);
    if (idx - 1 >= 0) {
      const active = getLastDescendent(items[idx - 1]);
      setActive(active.id);
    } else {
      if (parent) {
        setActive(parent.id);
      }
    }
  };

  const handleIndent: BranchProps['onItemIndent'] = (parent, item, left) => {
    const items = getItems(parent);
    const idx = items.findIndex(({ id }) => id === item.id) ?? -1;
    if (left) {
      if (parent) {
        // Move all siblings.
        const move = items.splice(idx, items.length - idx);

        // Get parent's parent.
        const ancestor = getParent(root, parent)!;
        const ancestorItems = getItems(ancestor);
        const parentIdx = ancestorItems.findIndex(({ id }) => id === parent.id);
        ancestorItems.splice(parentIdx + 1, 0, ...move);
      }
    } else {
      // Can't indent first child.
      if (idx > 0) {
        const siblingItems = getItems(items[idx - 1]);
        siblingItems.splice(siblingItems.length, 0, item);
        items.splice(idx, 1);
        // TODO(burdon): [Bug]: last item is sometimes lost (doesn't show up in tree). Mutation race condition?
        // console.log(item.id === siblingItems[siblingItems.length - 1].id, siblingItems.length);
      }
    }
  };

  const handleNav: BranchProps['onNav'] = (item, direction) => {
    switch (direction) {
      case 'home':
        setActive(root.items![0].id);
        break;
      case 'end':
        setActive(root.items![root.items!.length - 1].id);
        break;
      case 'up':
        {
          const previous = getPrevious(root, item);
          if (previous) {
            setActive(previous.id);
          }
        }
        break;
      case 'down':
        {
          const next = getNext(root, item);
          if (next) {
            setActive(next.id);
          }
        }
        break;
    }
  };

  return (
    <div role='tree'>
      <Branch
        root={root}
        active={active}
        onItemFocus={(item) => setActive(item.id)}
        onItemCreate={onCreate && handleCreate}
        onItemDelete={onDelete && handleDelete}
        onItemIndent={handleIndent}
        onNav={handleNav}
        {...props}
      />
    </div>
  );
};

export const Outliner = {
  Root,
  Branch,
  Item,
};
