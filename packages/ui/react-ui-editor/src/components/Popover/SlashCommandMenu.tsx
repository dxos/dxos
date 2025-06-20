//
// Copyright 2025 DXOS.org
//

import { type Line } from '@codemirror/state';
import { type EditorView } from '@codemirror/view';
import React, { useCallback, useEffect, useRef } from 'react';

import { Icon, Popover, useThemeContext } from '@dxos/react-ui';
import { type MaybePromise } from '@dxos/util';

export type SlashCommandGroup = {
  label: string;
  items: SlashCommandItem[];
};

export type SlashCommandItem = {
  id: string;
  label: string;
  icon: string;
  onSelect?: (view: EditorView, line: Line) => MaybePromise<void>;
};

export type SlashCommandMenuProps = {
  groups: SlashCommandGroup[];
  currentItem: string;
  onSelect: (item: SlashCommandItem) => void;
};

// NOTE: Not using DropdownMenu because the slash menu needs to manage focus explicitly.
export const SlashCommandMenu = ({ groups, currentItem, onSelect }: SlashCommandMenuProps) => {
  const { tx } = useThemeContext();
  return (
    <Popover.Portal>
      <Popover.Content
        align='start'
        onOpenAutoFocus={(event) => event.preventDefault()}
        classNames={tx('menu.content', 'menu--exotic-unfocusable', { elevation: 'positioned' }, [
          'max-h-[300px] overflow-y-auto',
        ])}
      >
        <Popover.Viewport classNames={tx('menu.viewport', 'menu__viewport--exotic-unfocusable', {})}>
          <ul>
            {groups.map((group, index) => (
              <React.Fragment key={group.label}>
                <SlashCommandGroup group={group} currentItem={currentItem} onSelect={onSelect} />
                {index < groups.length - 1 && <div className={tx('menu.separator', 'menu__item', {})} />}
              </React.Fragment>
            ))}
          </ul>
        </Popover.Viewport>
      </Popover.Content>
    </Popover.Portal>
  );
};

const SlashCommandGroup = ({
  group,
  currentItem,
  onSelect,
}: {
  group: SlashCommandGroup;
  currentItem: string;
  onSelect: (item: SlashCommandItem) => void;
}) => {
  const { tx } = useThemeContext();
  return (
    <>
      <div className={tx('menu.groupLabel', 'menu__group__label', {})}>
        <span>{group.label}</span>
      </div>
      {group.items.map((item) => (
        <SlashCommandMenuItem key={item.id} item={item} current={currentItem === item.id} onSelect={onSelect} />
      ))}
    </>
  );
};

const SlashCommandMenuItem = ({
  item,
  current,
  onSelect,
}: {
  item: SlashCommandItem;
  current: boolean;
  onSelect: (item: SlashCommandItem) => void;
}) => {
  const ref = useRef<HTMLLIElement>(null);
  const { tx } = useThemeContext();
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
      <Icon icon={item.icon} size={5} />
      <span className='grow truncate'>{item.label}</span>
    </li>
  );
};

export const getItem = (groups: SlashCommandGroup[], id: string): SlashCommandItem | undefined => {
  return groups.flatMap((group) => group.items).find((item) => item.id === id);
};

export const getNextItem = (groups: SlashCommandGroup[], id: string): SlashCommandItem => {
  const items = groups.flatMap((group) => group.items);
  const index = items.findIndex((item) => item.id === id);
  return items[(index + 1) % items.length];
};

export const getPreviousItem = (groups: SlashCommandGroup[], id: string): SlashCommandItem => {
  const items = groups.flatMap((group) => group.items);
  const index = items.findIndex((item) => item.id === id);
  return items[(index - 1 + items.length) % items.length];
};

export const filterItems = (
  groups: SlashCommandGroup[],
  filter: (item: SlashCommandItem) => boolean,
): SlashCommandGroup[] => {
  return groups.map((group) => ({
    ...group,
    items: group.items.filter(filter),
  }));
};

export const coreSlashCommands: SlashCommandGroup = {
  label: 'Markdown',
  items: [
    {
      id: 'heading-1',
      label: 'Heading 1',
      icon: 'ph--text-h-one--regular',
      onSelect: (view, line) => {
        const insert = '# ';
        view.dispatch({
          changes: { from: line.from, to: line.to, insert },
          selection: { anchor: line.from + insert.length, head: line.from + insert.length },
        });
      },
    },
    {
      id: 'heading-2',
      label: 'Heading 2',
      icon: 'ph--text-h-two--regular',
      onSelect: (view, line) => {
        const insert = '## ';
        view.dispatch({
          changes: { from: line.from, to: line.to, insert },
          selection: { anchor: line.from + insert.length, head: line.from + insert.length },
        });
      },
    },
    {
      id: 'heading-3',
      label: 'Heading 3',
      icon: 'ph--text-h-three--regular',
      onSelect: (view, line) => {
        const insert = '### ';
        view.dispatch({
          changes: { from: line.from, to: line.to, insert },
          selection: { anchor: line.from + insert.length, head: line.from + insert.length },
        });
      },
    },
    {
      id: 'heading-4',
      label: 'Heading 4',
      icon: 'ph--text-h-four--regular',
      onSelect: (view, line) => {
        const insert = '#### ';
        view.dispatch({
          changes: { from: line.from, to: line.to, insert },
          selection: { anchor: line.from + insert.length, head: line.from + insert.length },
        });
      },
    },
    {
      id: 'heading-5',
      label: 'Heading 5',
      icon: 'ph--text-h-five--regular',
      onSelect: (view, line) => {
        const insert = '##### ';
        view.dispatch({
          changes: { from: line.from, to: line.to, insert },
          selection: { anchor: line.from + insert.length, head: line.from + insert.length },
        });
      },
    },
    {
      id: 'heading-6',
      label: 'Heading 6',
      icon: 'ph--text-h-six--regular',
      onSelect: (view, line) => {
        const insert = '###### ';
        view.dispatch({
          changes: { from: line.from, to: line.to, insert },
          selection: { anchor: line.from + insert.length, head: line.from + insert.length },
        });
      },
    },
    {
      id: 'bullet-list',
      label: 'Bullet List',
      icon: 'ph--list-bullets--regular',
      onSelect: (view, line) => {
        const insert = '- ';
        view.dispatch({
          changes: { from: line.from, to: line.to, insert },
          selection: { anchor: line.from + insert.length, head: line.from + insert.length },
        });
      },
    },
    {
      id: 'numbered-list',
      label: 'Numbered List',
      icon: 'ph--list-numbers--regular',
      onSelect: (view, line) => {
        const insert = '1. ';
        view.dispatch({
          changes: { from: line.from, to: line.to, insert },
          selection: { anchor: line.from + insert.length, head: line.from + insert.length },
        });
      },
    },
    {
      id: 'task-list',
      label: 'Task List',
      icon: 'ph--list-checks--regular',
      onSelect: (view, line) => {
        const insert = '- [ ] ';
        view.dispatch({
          changes: { from: line.from, to: line.to, insert },
          selection: { anchor: line.from + insert.length, head: line.from + insert.length },
        });
      },
    },
    {
      id: 'quote',
      label: 'Quote',
      icon: 'ph--quotes--regular',
      onSelect: (view, line) => {
        const insert = '> ';
        view.dispatch({
          changes: { from: line.from, to: line.to, insert },
          selection: { anchor: line.from + insert.length, head: line.from + insert.length },
        });
      },
    },
    {
      id: 'code-block',
      label: 'Code Block',
      icon: 'ph--code-block--regular',
      onSelect: (view, line) => {
        const insert = '```\n\n```';
        view.dispatch({
          changes: { from: line.from, to: line.to, insert },
          selection: { anchor: line.from + insert.length / 2, head: line.from + insert.length / 2 },
        });
      },
    },
    {
      id: 'table',
      label: 'Table',
      icon: 'ph--table--regular',
      onSelect: (view, line) => {
        const insert = '| | | |\n|---|---|---|\n| | | |';
        view.dispatch({
          changes: { from: line.from, to: line.to, insert },
          selection: { anchor: line.from + insert.length, head: line.from + insert.length },
        });
      },
    },
  ],
};
