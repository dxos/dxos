//
// Copyright 2026 DXOS.org
//

import React, { type ReactElement, type ReactNode, useRef, useState } from 'react';

import * as Button from '@dxos/react-ui/Button';
import * as Combobox from '@dxos/react-ui/Combobox';
import * as Icon from '@dxos/react-ui/Icon';
import * as Layout from '@dxos/react-ui/Layout';
import * as Menu from '@dxos/react-ui/Menu';

/** One thing to pick: a space or a diagram. */
export type PillEntry = {
  value: string;
  label: string;
  /** The leading glyph: an icon or an avatar. */
  leading: ReactNode;
  testId?: string;
};

/** A row's own menu item. */
export type PillEntryAction = {
  value: string;
  label: string;
  icon: string;
  destructive?: boolean;
  testId?: string;
};

/** A command under the separator, shown whatever is typed. */
export type PillAction = {
  value: string;
  label: string;
  icon: string;
  shortcut?: string;
  testId?: string;
};

export type PillComboboxProps = {
  trigger: ReactElement;
  placeholder: string;
  entries: PillEntry[];
  /** The commands for the typed query, e.g. a create that takes the query as its name. */
  actions: (query: string) => PillAction[];
  /** Per-row menu items; rows have no menu when this is empty. */
  entryActions?: PillEntryAction[];
  current?: string;
  onSelect: (value: string) => void;
  onAction: (value: string, query: string) => void;
  onEntryAction?: (action: string, entry: string) => void;
  /** The popup's width class, from the mockup. */
  width: string;
  testId?: string;
};

const ACTION_PREFIX = 'pill-action:';

const matches = (option: Combobox.Option, query: string) =>
  option.value.startsWith(ACTION_PREFIX) || option.label.toLowerCase().includes(query.toLowerCase());

// Fixed columns, so every row's glyph, label, check and menu line up whatever the row holds.
const LEADING = 'w-6 shrink-0';
const TRAILING = 'w-7 shrink-0';

/**
 * A pill menu (spec F-3, F-4): a button that opens a search over the entries, each with a leading glyph, the current
 * one checked, and an optional row menu; the commands follow under a separator and are always shown.
 */
export const PillCombobox = ({
  trigger,
  placeholder,
  entries,
  actions,
  entryActions = [],
  current,
  onSelect,
  onAction,
  onEntryAction,
  width,
  testId,
}: PillComboboxProps) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  // A row's menu portals outside the popup, so a click in it reads as outside; the popup stays open under it.
  const [rowMenuOpen, setRowMenuOpen] = useState(false);
  // An action that opens a dialog waits for the popup to close, whose focus return would otherwise dismiss it.
  const pendingRef = useRef<() => void>(undefined);

  const commands = actions(query);
  const items: Combobox.Option[] = [
    ...entries.map(({ value, label }) => ({ value, label })),
    ...commands.map(({ value, label }) => ({ value: ACTION_PREFIX + value, label })),
  ];
  // The Root narrows its collection with the same filter; the rows must match it for keyboard order.
  const visible = query ? entries.filter((entry) => matches(entry, query)) : entries;

  const close = (then?: () => void) => {
    pendingRef.current = then;
    setRowMenuOpen(false);
    setOpen(false);
  };

  return (
    <Combobox.Root
      items={items}
      filter={matches}
      open={open}
      onOpenChange={({ open }) => (open || !rowMenuOpen) && setOpen(open)}
      onExitComplete={() => {
        pendingRef.current?.();
        pendingRef.current = undefined;
      }}
      value={current ? [current] : []}
      onValueChange={({ value: [value] }) => {
        if (value?.startsWith(ACTION_PREFIX)) {
          const text = query;
          close(() => onAction(value.slice(ACTION_PREFIX.length), text));
        } else if (value) {
          onSelect(value);
        }
      }}
      onInputValueChange={({ inputValue, reason }) => setQuery(reason === 'input-change' ? inputValue : '')}
    >
      <Combobox.Trigger asChild>{trigger}</Combobox.Trigger>
      <Combobox.Content classNames={width} data-testid={testId}>
        <Combobox.Input placeholder={placeholder} data-testid={testId && `${testId}.find`} />
        <Combobox.List>
          {visible.map((entry) => (
            <Combobox.Item
              key={entry.value}
              item={{ value: entry.value, label: entry.label }}
              data-testid={entry.testId}
            >
              <Layout.Flex center classNames={LEADING}>
                {entry.leading}
              </Layout.Flex>
              <Combobox.ItemText classNames='grow' />
              <Icon.Icon
                icon='ph--check--regular'
                classNames={['shrink-0', entry.value === current ? undefined : 'invisible']}
              />
              {entryActions.length > 0 && (
                <Layout.Flex center classNames={TRAILING}>
                  <RowMenu
                    entry={entry}
                    actions={entryActions}
                    onOpenChange={setRowMenuOpen}
                    onAction={(action) => close(() => onEntryAction?.(action, entry.value))}
                  />
                </Layout.Flex>
              )}
            </Combobox.Item>
          ))}
          <Layout.Separator decorative classNames='my-1' />
          {commands.map((command) => (
            <Combobox.Item
              key={command.value}
              item={{ value: ACTION_PREFIX + command.value, label: command.label }}
              data-testid={command.testId}
            >
              <Layout.Flex center classNames={LEADING}>
                <Icon.Icon icon={command.icon} />
              </Layout.Flex>
              <Combobox.ItemText classNames='grow' />
              {command.shortcut && (
                <kbd aria-hidden className='dx-menu-shortcut'>
                  {command.shortcut}
                </kbd>
              )}
            </Combobox.Item>
          ))}
        </Combobox.List>
      </Combobox.Content>
    </Combobox.Root>
  );
};

type RowMenuProps = {
  entry: PillEntry;
  actions: PillEntryAction[];
  onOpenChange: (open: boolean) => void;
  onAction: (action: string) => void;
};

/** A row's own menu; its clicks stay off the row, which would otherwise pick it. */
const RowMenu = ({ entry, actions, onOpenChange, onAction }: RowMenuProps) => (
  <Menu.Root onOpenChange={({ open }) => onOpenChange(open)} onSelect={({ value }) => onAction(value)}>
    <Menu.Trigger asChild>
      <Button.Root
        variant='ghost'
        compact
        iconOnly
        icon='ph--dots-three--regular'
        label={`Actions for ${entry.label}`}
        data-testid={entry.testId && `${entry.testId}.actions`}
        onClick={(event) => event.stopPropagation()}
      />
    </Menu.Trigger>
    {/* React bubbles the menu's clicks through its portal to the row, which would pick it. */}
    <Menu.Content classNames='w-45' onClick={(event) => event.stopPropagation()}>
      {actions.map((action) => (
        <Menu.Item
          key={action.value}
          item={{ value: action.value, label: action.label, icon: action.icon }}
          classNames={action.destructive ? 'text-error-text' : undefined}
          data-testid={action.testId}
        />
      ))}
    </Menu.Content>
  </Menu.Root>
);
