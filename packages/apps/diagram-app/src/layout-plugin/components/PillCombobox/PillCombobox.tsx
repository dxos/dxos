//
// Copyright 2026 DXOS.org
//

import React, { type ReactElement, type ReactNode, useRef, useState } from 'react';

import { Picker } from '@dxos/react-ui-list';
import { SearchList } from '@dxos/react-ui-search';
import * as Button from '@dxos/react-ui/Button';
import * as Icon from '@dxos/react-ui/Icon';
import * as Layout from '@dxos/react-ui/Layout';
import * as Menu from '@dxos/react-ui/Menu';
import * as Popover from '@dxos/react-ui/Popover';

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

// Fixed columns, so every row's glyph, label, check and menu line up whatever the row holds.
const LEADING = 'w-6 shrink-0';
const TRAILING = 'w-7 shrink-0';
const ROW = 'flex items-center gap-2 px-2 rounded-xs';

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

  const text = query.trim().toLowerCase();
  const visible = text ? entries.filter(({ label }) => label.toLowerCase().includes(text)) : entries;

  const close = (then?: () => void) => {
    pendingRef.current = then;
    setRowMenuOpen(false);
    setOpen(false);
  };

  return (
    <Popover.Root
      open={open}
      onOpenChange={({ open }) => {
        if (open || !rowMenuOpen) {
          setOpen(open);
          setQuery('');
        }
      }}
      onExitComplete={() => {
        pendingRef.current?.();
        pendingRef.current = undefined;
      }}
    >
      <Popover.Trigger asChild>{trigger}</Popover.Trigger>
      <Popover.Content arrow={false} classNames={[width, 'p-1']} data-testid={testId}>
        <SearchList.Root debounceMs={0} onSearch={setQuery} resetSelectionOnChange>
          <SearchList.Input autoFocus placeholder={placeholder} data-testid={testId && `${testId}.find`} />
          <SearchList.Viewport padding={false} classNames='max-h-80 mt-1'>
            {visible.map((entry) => (
              <Picker.Item
                key={entry.value}
                value={entry.value}
                classNames={ROW}
                data-testid={entry.testId}
                onSelect={() => {
                  setOpen(false);
                  onSelect(entry.value);
                }}
              >
                <Layout.Flex center classNames={LEADING}>
                  {entry.leading}
                </Layout.Flex>
                <span className='w-0 grow truncate'>{entry.label}</span>
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
              </Picker.Item>
            ))}
            <Layout.Separator decorative classNames='my-1' />
            {actions(query).map((command) => (
              <Picker.Item
                key={command.value}
                value={ACTION_PREFIX + command.value}
                classNames={ROW}
                data-testid={command.testId}
                onSelect={() => {
                  const typed = query;
                  close(() => onAction(command.value, typed));
                }}
              >
                <Layout.Flex center classNames={LEADING}>
                  <Icon.Icon icon={command.icon} />
                </Layout.Flex>
                <span className='w-0 grow truncate'>{command.label}</span>
                {command.shortcut && (
                  <kbd aria-hidden className='dx-menu-shortcut'>
                    {command.shortcut}
                  </kbd>
                )}
              </Picker.Item>
            ))}
          </SearchList.Viewport>
        </SearchList.Root>
      </Popover.Content>
    </Popover.Root>
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
