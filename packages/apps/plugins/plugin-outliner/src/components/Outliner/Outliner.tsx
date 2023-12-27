//
// Copyright 2023 DXOS.org
//

import { DotsThreeVertical, DotOutline, X } from '@phosphor-icons/react';
import React, { type HTMLAttributes, type KeyboardEventHandler, useEffect, useRef, useState } from 'react';
import { EditorView } from '@codemirror/view';

import { Button, DensityProvider, DropdownMenu, Input, useTranslation } from '@dxos/react-ui';
import { TextEditor, useTextModel, type CursorInfo, type TextEditorRef, type YText } from '@dxos/react-ui-editor';
import { getSize, mx } from '@dxos/react-ui-theme';

import { getNext, getParent, getPrevious, getItems, type Item, getLastDescendent } from './types';
import { OUTLINER_PLUGIN } from '../../meta';
import { tryParseOutline } from '../../utils';
import { Tree } from '@braneframe/types';

type OutlinerOptions = Pick<HTMLAttributes<HTMLInputElement>, 'placeholder' | 'spellCheck'> & {
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

type OutlinerItemProps = {
  item: Item;
  active?: CursorSelection; // Request focus.
  onSelect?: () => void;
  onEnter?: (state?: CursorInfo) => void;
  onDelete?: (state?: CursorInfo) => void;
  onIndent?: (direction?: 'left' | 'right') => void;
  onShift?: (direction?: 'up' | 'down') => void;
  onCursor?: (direction?: 'home' | 'end' | 'up' | 'down', pos?: number) => void;
  onPaste?: (items: Tree.Item[]) => void;
} & OutlinerOptions;

const OutlinerItem = ({
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
  onPaste,
}: OutlinerItemProps) => {
  const { t } = useTranslation(OUTLINER_PLUGIN);
  const model = useTextModel({ text: item.text });
  const [focus, setFocus] = useState<boolean>();
  useEffect(() => {
    if (focus) {
      onSelect?.();
    }
  }, [focus]);

  const editorRef = useRef<TextEditorRef>(null);
  useEffect(() => {
    if (editorRef.current && active && !focus) {
      // TODO(burdon): Hack since ref isn't instantiated yet.
      //  NOTE: This happens with the line is split and a new line is created and set as the active line.
      setTimeout(() => {
        editorRef.current?.view?.focus();
        const from = active.from === -1 ? editorRef.current?.view?.state.doc.length : active.from;
        if (from !== undefined) {
          editorRef.current?.view?.dispatch({ selection: { anchor: from, head: active.to ?? from } });
        }
      });
    }
  }, [editorRef.current?.view, active]);

  const handleKeyDown: KeyboardEventHandler<HTMLDivElement> = (event) => {
    const view = editorRef.current?.view;
    if (!view) {
      return;
    }

    // TODO(burdon): Factor out util.
    const { head, from, to } = view.state.selection.ranges[0];
    const { number: line } = view.state.doc.lineAt(head);
    const after = view.state.sliceDoc(from);
    const lines = view.state.doc.lines;
    const state = { from, to, line, lines, after };

    const { key, shiftKey } = event;
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
    <div className='flex group' onKeyDownCapture={handleKeyDown}>
      {(isTasklist && (
        <div className='mt-0.5 mr-2.5'>
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
        <div className='mr-1 cursor-pointer' title={item.id.slice(0, 8)} onClick={() => onSelect?.()}>
          <DotOutline
            weight={focus ? 'fill' : undefined}
            className={mx('shrink-0', getSize(6), active && 'text-primary-500')}
          />
        </div>
      )}

      {model && (
        <TextEditor
          ref={editorRef}
          model={model}
          extensions={[
            EditorView.domEventHandlers({
              paste(event, view) { 
                const text = event.clipboardData?.getData('text/plain')
                if(!text) {
                  return;
                }

                const outline = tryParseOutline(text);
                if(!outline || outline.length === 0) {
                  return;
                }

                event.preventDefault();
                onPaste?.(outline);
              }
            })
          ]}
          slots={{
            root: {
              className: 'w-full',
              onFocus: () => setFocus(true),
              onBlur: () => setFocus(false),
            },
            editor: {
              placeholder,
            },
          }}
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

type OutlinerBranchProps = OutlinerOptions & {
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
  const handlePaste = (target: Item, items: Tree.Item[]) => {
    const idx = root.items!.findIndex(({ id }) => id === target.id);
    const replaceTarget = target.text?.text.length === 0;

    root.items?.splice(replaceTarget ? idx : (idx + 1), replaceTarget ? 1 : 0, ...items as any); // TODO(dmaretskyi): Type mismatch.

    // Save children of the replaced item
    if(replaceTarget) {
      items[0].items.splice(0, 0, ...(target.items ?? []) as any);
    }
  }

  return (
    <div className={className}>
      {root.items?.map((item) => (
        <div key={item.id}>
          <OutlinerItem
            item={item}
            active={active?.itemId === item.id ? active : undefined}
            placeholder='Enter text'
            onCursor={(...args) => onItemCursor?.(root, item, ...args)}
            onSelect={() => onItemSelect?.(root, item)}
            onEnter={(...args) => onItemCreate?.(root, item, ...args)}
            onDelete={(...args) => onItemDelete?.(root, item, ...args)}
            onIndent={(...args) => onItemIndent?.(root, item, ...args)}
            onShift={(...args) => onItemShift?.(root, item, ...args)}
            onPaste={items => handlePaste(item, items)}
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
  const handleCursor: OutlinerBranchProps['onItemCursor'] = (parent, item, direction, pos) => {
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
