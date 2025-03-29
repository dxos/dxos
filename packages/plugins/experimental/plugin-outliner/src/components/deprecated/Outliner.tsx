//
// Copyright 2023 DXOS.org
//

import { Prec } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { ArrowSquareOut, Circle, DotsThreeVertical, X } from '@phosphor-icons/react';
import React, { type ComponentPropsWithoutRef, StrictMode, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { Ref } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { createDocAccessor, makeRef } from '@dxos/react-client/echo';
import { Button, DropdownMenu, Input, useThemeContext, useTranslation } from '@dxos/react-ui';
import {
  type CursorInfo,
  automerge,
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
  formattingKeymap,
  useTextEditor,
} from '@dxos/react-ui-editor';
import { getSize, mx } from '@dxos/react-ui-theme';

import { OUTLINER_PLUGIN } from '../../meta';
import { getNext, getParent, getPrevious, getChildNodes, getLastDescendent } from '../../types';
import { type TreeNodeType } from '../../types';

type CursorSelection = {
  itemId: string;
  anchor?: number;
};

type OutlinerOptions = Pick<ComponentPropsWithoutRef<'input'>, 'placeholder' | 'spellCheck'> & {
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
  item: TreeNodeType;
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

  const { parentRef, view } = useTextEditor(
    () => ({
      initialValue: item.text,
      extensions: [
        EditorView.updateListener.of(({ view }) => setFocus(view.hasFocus)),
        createBasicExtensions({ placeholder }),
        createMarkdownExtensions({ themeMode }),
        createThemeExtensions({ themeMode }),
        decorateMarkdown({ renderLinkButton: onRenderLink }),
        formattingKeymap(),
        automerge(createDocAccessor(item, ['text'])),
        keymap,
      ],
    }),
    [item, themeMode],
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
  root: TreeNodeType;
  active?: CursorSelection;
  onItemCursor?: (parent: TreeNodeType, item: TreeNodeType, direction?: string, anchor?: number) => void;
  onItemSelect?: (parent: TreeNodeType, item: TreeNodeType) => void;
  onItemCreate?: (parent: TreeNodeType, item: TreeNodeType, state?: CursorInfo, after?: boolean) => TreeNodeType;
  onItemDelete?: (parent: TreeNodeType, item: TreeNodeType, state?: CursorInfo) => void;
  onItemIndent?: (parent: TreeNodeType, item: TreeNodeType, direction?: string) => void;
  onItemShift?: (parent: TreeNodeType, item: TreeNodeType, direction?: string) => void;
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
      {root.children
        ?.map((ref) => ref.target)
        .filter((item): item is TreeNodeType => item?.text != null)
        .map((item) => (
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
            {(item.children?.length ?? 0) > 0 && (
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
  root: TreeNodeType;
  onCreate?: (text?: string) => TreeNodeType;
  onDelete?: (item: TreeNodeType) => void;
} & OutlinerOptions;

const OutlinerRoot = ({ className, root, onCreate, onDelete, ...props }: OutlinerRootProps) => {
  const [active, setActive] = useState<CursorSelection>();

  //
  // Create/split line.
  //
  const handleCreate: OutlinerBranchProps['onItemCreate'] = (parent, current, state) => {
    const items = getChildNodes(parent);
    const idx = items.findIndex((v) => current.id === v?.id);

    let item: TreeNodeType;
    if (state?.from === 0 && state?.after?.length) {
      // Insert before.
      item = onCreate!();
      items.splice(idx, 0, item);
    } else {
      // Insert after.
      item = onCreate!(state?.after?.trim());

      // TODO(dmaretskyi): Line splitting.
      // if (state?.after) {
      //   // Split line.
      //   const text = current.text!.text;
      //   text.delete(state.from, text.length);
      // }

      if (current.children?.length) {
        current.children.splice(0, 0, makeRef(item));
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
    if (parent === root && parent.children?.length === 1) {
      return;
    }

    const items = getChildNodes(parent);
    const idx = items.findIndex((v) => v?.id === item.id);

    // Don't delete if not empty and first in list.
    if (idx === 0 && state?.after?.length) {
      return;
    }

    // Remove and add children.
    const children = getChildNodes(item);
    items.splice(idx, 1);
    onDelete!(item);

    // Join to previous line.
    if (idx - 1 >= 0) {
      const active = getLastDescendent(items[idx - 1]!);
      if (active.text) {
        const text = active.text;
        const from = text.length;

        // TODO(dmaretskyi): Line joining.
        // if (state?.after?.length) {
        //   text.insert(from, state.after.trim());
        // }

        setActive({ itemId: active.id, anchor: from });
        const items = getChildNodes(active);
        items.splice(items.length, 0, ...(children ?? []));
      }
    } else {
      const text = parent.text;
      const from = text.length;
      setActive({ itemId: parent.id, anchor: from });
    }
  };

  //
  // Indent.
  //
  const handleIndent: OutlinerBranchProps['onItemIndent'] = (parent, item, direction) => {
    const items = getChildNodes(parent);
    const idx = items.findIndex((v) => v?.id === item.id) ?? -1;
    switch (direction) {
      case 'left': {
        if (parent) {
          // Get parent's parent.
          const ancestor = getParent(root, parent)!;
          if (ancestor) {
            // Move all siblings.
            const move = items.splice(idx, items.length - idx);
            const ancestorItems = getChildNodes(ancestor);
            const parentIdx = ancestorItems.findIndex((v) => v?.id === parent.id);
            ancestorItems.splice(parentIdx + 1, 0, ...move);
          }
        }
        break;
      }

      case 'right': {
        // Can't indent first child.
        if (idx > 0) {
          const siblingItems = getChildNodes(items[idx - 1]!);
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
    const idx = parent.children?.findIndex(Ref.hasObjectId(item.id));
    if (idx === undefined) {
      return;
    }

    switch (direction) {
      case 'up': {
        if (idx > 0) {
          const previous = parent.children![idx - 1];
          parent.children!.splice(idx - 1, 2, makeRef(item), previous);
        }
        break;
      }

      case 'down':
        if (idx < parent.children!.length - 1) {
          const next = parent.children![idx + 1];
          parent.children!.splice(idx, 2, next, makeRef(item));
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
        invariant(root.children);
        setActive({ itemId: root.children[0]!.target!.id, anchor: 0 });
        break;
      }

      case 'end': {
        invariant(root.children);
        const last = getLastDescendent(root.children[root.children.length - 1]!.target!);
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
