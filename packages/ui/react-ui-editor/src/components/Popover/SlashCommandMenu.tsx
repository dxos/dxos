//
// Copyright 2025 DXOS.org
//

import { type Line } from '@codemirror/state';
import { type EditorView } from '@codemirror/view';
import React, { useCallback, useEffect, useRef } from 'react';

import { Icon, Popover, useThemeContext } from '@dxos/react-ui';

export type SlashCommandItem = {
  label: string;
  icon: string;
  onSelect?: (view: EditorView, line: Line) => void;
};

export type SlashCommandMenuProps = {
  items: SlashCommandItem[];
  currentItem: number;
  onSelect: (item: SlashCommandItem) => void;
};

// NOTE: Not using DropdownMenu because the slash menu needs to manage focus explicitly.
export const SlashCommandMenu = ({ items, currentItem, onSelect }: SlashCommandMenuProps) => {
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
            {items.map((item, index) => (
              <SlashCommandMenuItem key={item.label} item={item} current={currentItem === index} onSelect={onSelect} />
            ))}
          </ul>
        </Popover.Viewport>
      </Popover.Content>
    </Popover.Portal>
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
      <Icon icon={item.icon} size={4} />
      <span className='grow truncate'>{item.label}</span>
    </li>
  );
};

export const coreSlashCommandItems: SlashCommandItem[] = [
  {
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
];
