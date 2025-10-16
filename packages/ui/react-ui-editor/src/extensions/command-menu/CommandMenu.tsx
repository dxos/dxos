//
// Copyright 2025 DXOS.org
//

import { type EditorView } from '@codemirror/view';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, { Fragment, type PropsWithChildren, useCallback, useEffect, useRef, useState } from 'react';

import { addEventListener } from '@dxos/async';
import {
  type DxAnchorActivate,
  Icon,
  type Label,
  Popover,
  toLocalizedString,
  useThemeContext,
  useTranslation,
} from '@dxos/react-ui';
import { type MaybePromise } from '@dxos/util';

import { commandRangeEffect } from '../../extensions';

// TODO(burdon): Rename ComboBox (and factor out to separate package).

export type CommandMenuGroup = {
  id: string;
  label?: Label;
  items: CommandMenuItem[];
};

export type CommandMenuItem = {
  id: string;
  label: Label;
  icon?: string;
  onSelect?: (view: EditorView, head: number) => MaybePromise<void>;
};

export type CommandMenuProps = PropsWithChildren<{
  groups: CommandMenuGroup[];
  onSelect: (item: CommandMenuItem) => void;
  onActivate?: (event: DxAnchorActivate) => void;
  currentItem?: string;
  open?: boolean;
  onOpenChange?: (nextOpen: boolean) => void;
  defaultOpen?: boolean;
}>;

// NOTE: Not using DropdownMenu because the command menu needs to manage focus explicitly.
export const CommandMenuProvider = ({
  groups,
  onSelect,
  onActivate,
  currentItem,
  children,
  open: propsOpen,
  onOpenChange,
  defaultOpen,
}: CommandMenuProps) => {
  const { tx } = useThemeContext();
  const groupsWithItems = groups.filter((group) => group.items.length > 0);
  const trigger = useRef<HTMLButtonElement | null>(null);

  const [open, setOpen] = useControllableState({
    prop: propsOpen,
    onChange: onOpenChange,
    defaultProp: defaultOpen,
  });

  const handleDxAnchorActivate = useCallback(
    (event: DxAnchorActivate) => {
      const { trigger: dxTrigger, refId } = event;
      // If this has a `refId`, then it’s probably a URL or DXN and out of scope for this component.
      if (!refId) {
        trigger.current = dxTrigger as HTMLButtonElement;
        if (onActivate) {
          onActivate(event);
        } else {
          queueMicrotask(() => setOpen(true));
        }
      }
    },
    [onActivate],
  );

  const [rootRef, setRootRef] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!rootRef || !handleDxAnchorActivate) {
      return;
    }

    return addEventListener(rootRef, 'dx-anchor-activate' as any, handleDxAnchorActivate, {
      capture: true,
      passive: false,
    });
  }, [rootRef, handleDxAnchorActivate]);

  return (
    <Popover.Root modal={false} open={open} onOpenChange={setOpen}>
      <Popover.Portal>
        <Popover.Content
          align='start'
          onOpenAutoFocus={(event) => event.preventDefault()}
          classNames={tx('menu.content', 'menu--exotic-unfocusable', { elevation: 'positioned' }, [
            'max-bs-80 overflow-y-auto',
          ])}
        >
          <Popover.Viewport classNames={tx('menu.viewport', 'menu__viewport--exotic-unfocusable', {})}>
            <ul>
              {groupsWithItems.map((group, index) => (
                <Fragment key={group.id}>
                  <CommandGroup group={group} currentItem={currentItem} onSelect={onSelect} />
                  {index < groupsWithItems.length - 1 && <div className={tx('menu.separator', 'menu__item', {})} />}
                </Fragment>
              ))}
            </ul>
          </Popover.Viewport>
          <Popover.Arrow />
        </Popover.Content>
      </Popover.Portal>
      <Popover.VirtualTrigger virtualRef={trigger} />
      <div role='none' className='contents' ref={setRootRef}>
        {children}
      </div>
    </Popover.Root>
  );
};

const CommandGroup = ({
  group,
  currentItem,
  onSelect,
}: {
  group: CommandMenuGroup;
  currentItem?: string;
  onSelect: (item: CommandMenuItem) => void;
}) => {
  const { tx } = useThemeContext();
  const { t } = useTranslation();
  return (
    <>
      {group.label && (
        <div className={tx('menu.groupLabel', 'menu__group__label', {})}>
          <span>{toLocalizedString(group.label, t)}</span>
        </div>
      )}
      {group.items.map((item) => (
        <CommandItem key={item.id} item={item} current={currentItem === item.id} onSelect={onSelect} />
      ))}
    </>
  );
};

const CommandItem = ({
  item,
  current,
  onSelect,
}: {
  item: CommandMenuItem;
  current: boolean;
  onSelect: (item: CommandMenuItem) => void;
}) => {
  const ref = useRef<HTMLLIElement>(null);
  const { tx } = useThemeContext();
  const { t } = useTranslation();
  const handleSelect = useCallback(() => onSelect(item), [item, onSelect]);

  useEffect(() => {
    if (current && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [current]);

  return (
    <li
      ref={ref}
      className={tx('menu.item', 'menu__item--exotic-unfocusable', {}, [current && 'bg-hoverSurface'])}
      onClick={handleSelect}
    >
      {item.icon && <Icon icon={item.icon} size={5} />}
      <span className='grow truncate'>{toLocalizedString(item.label, t)}</span>
    </li>
  );
};

// TODO(wittjosiah): Factor out into a separate file.

//
// Helpers
//

export const getItem = (groups: CommandMenuGroup[], id?: string): CommandMenuItem | undefined => {
  return groups.flatMap((group) => group.items).find((item) => item.id === id);
};

export const getNextItem = (groups: CommandMenuGroup[], id?: string): CommandMenuItem => {
  const items = groups.flatMap((group) => group.items);
  const index = items.findIndex((item) => item.id === id);
  return items[(index + 1) % items.length];
};

export const getPreviousItem = (groups: CommandMenuGroup[], id?: string): CommandMenuItem => {
  const items = groups.flatMap((group) => group.items);
  const index = items.findIndex((item) => item.id === id);
  return items[(index - 1 + items.length) % items.length];
};

export const filterItems = (
  groups: CommandMenuGroup[],
  filter: (item: CommandMenuItem) => boolean,
): CommandMenuGroup[] => {
  return groups.map((group) => ({
    ...group,
    items: group.items.filter(filter),
  }));
};

// TODO(burdon): Remove.
export const insertAtCursor = (view: EditorView, head: number, insert: string) => {
  view.dispatch({
    changes: { from: head, to: head, insert },
    selection: { anchor: head + insert.length, head: head + insert.length },
  });
};

/**
 * If the cursor is at the start of a line, insert the text at the cursor.
 * Otherwise, insert the text on a new line.
 */
export const insertAtLineStart = (view: EditorView, head: number, insert: string) => {
  const line = view.state.doc.lineAt(head);
  if (line.from === head) {
    insertAtCursor(view, head, insert);
  } else {
    insert = '\n' + insert;
    view.dispatch({
      changes: { from: line.to, to: line.to, insert },
      selection: { anchor: line.to + insert.length, head: line.to + insert.length },
    });
  }
};

export const coreSlashCommands: CommandMenuGroup = {
  id: 'markdown',
  label: 'Markdown',
  items: [
    {
      id: 'heading-1',
      label: 'Heading 1',
      icon: 'ph--text-h-one--regular',
      onSelect: (view, head) => insertAtLineStart(view, head, '# '),
    },
    {
      id: 'heading-2',
      label: 'Heading 2',
      icon: 'ph--text-h-two--regular',
      onSelect: (view, head) => insertAtLineStart(view, head, '## '),
    },
    {
      id: 'heading-3',
      label: 'Heading 3',
      icon: 'ph--text-h-three--regular',
      onSelect: (view, head) => insertAtLineStart(view, head, '### '),
    },
    {
      id: 'heading-4',
      label: 'Heading 4',
      icon: 'ph--text-h-four--regular',
      onSelect: (view, head) => insertAtLineStart(view, head, '#### '),
    },
    {
      id: 'heading-5',
      label: 'Heading 5',
      icon: 'ph--text-h-five--regular',
      onSelect: (view, head) => insertAtLineStart(view, head, '##### '),
    },
    {
      id: 'heading-6',
      label: 'Heading 6',
      icon: 'ph--text-h-six--regular',
      onSelect: (view, head) => insertAtLineStart(view, head, '###### '),
    },
    {
      id: 'bullet-list',
      label: 'Bullet List',
      icon: 'ph--list-bullets--regular',
      onSelect: (view, head) => insertAtLineStart(view, head, '- '),
    },
    {
      id: 'numbered-list',
      label: 'Numbered List',
      icon: 'ph--list-numbers--regular',
      onSelect: (view, head) => insertAtLineStart(view, head, '1. '),
    },
    {
      id: 'task-list',
      label: 'Task List',
      icon: 'ph--list-checks--regular',
      onSelect: (view, head) => insertAtLineStart(view, head, '- [ ] '),
    },
    {
      id: 'quote',
      label: 'Quote',
      icon: 'ph--quotes--regular',
      onSelect: (view, head) => insertAtLineStart(view, head, '> '),
    },
    {
      id: 'code-block',
      label: 'Code Block',
      icon: 'ph--code-block--regular',
      onSelect: (view, head) => insertAtLineStart(view, head, '```\n\n```'),
    },
    {
      id: 'table',
      label: 'Table',
      icon: 'ph--table--regular',
      onSelect: (view, head) => insertAtLineStart(view, head, '| | | |\n|---|---|---|\n| | | |'),
    },
  ],
};

export const linkSlashCommands: CommandMenuGroup = {
  id: 'link',
  label: 'Link',
  items: [
    {
      id: 'inline-link',
      label: 'Inline link',
      icon: 'ph--link--regular',
      onSelect: (view, head) =>
        view.dispatch({
          changes: { from: head, insert: '@' },
          selection: { anchor: head + 1, head: head + 1 },
          effects: commandRangeEffect.of({ trigger: '@', range: { from: head, to: head + 1 } }),
        }),
    },
    {
      id: 'block-embed',
      label: 'Block embed',
      icon: 'ph--lego--regular',
      onSelect: (view, head) =>
        view.dispatch({
          changes: { from: head, insert: '@@' },
          selection: { anchor: head + 2, head: head + 2 },
          effects: commandRangeEffect.of({ trigger: '@', range: { from: head, to: head + 2 } }),
        }),
    },
  ],
};
