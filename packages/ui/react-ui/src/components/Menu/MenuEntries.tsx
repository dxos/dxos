//
// Copyright 2026 DXOS.org
//

import React, { type MouseEvent, type PropsWithChildren, createContext, useCallback, useContext, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { keySymbols } from '@dxos/react-focus';
import { mx } from '@dxos/ui-theme';
import {
  type MenuActionEntry,
  type MenuEntry,
  type MenuGroupEntry,
  type MenuInvokeParams,
  toLocalizedString,
} from '@dxos/ui-types';

import { type IconButtonProps } from '../Button';
import { Icon } from '../Icon';
import { DropdownMenuParts as DropdownMenu } from './DropdownMenu';
import { type MenuLabelledEntry, getMenuEntryShortcut } from './menu-entry-label';

//
// Context: how entries are found and run. Whatever produces the entries (an action graph, component
// state) provides this; the renderers below only consume it.
//

/** Resolves a group's entries (the root's when `group` is undefined). A hook, so a source can subscribe. */
export type MenuEntriesHook = (group?: MenuGroupEntry) => MenuEntry[] | undefined;

export type MenuEntryExecutor = (entry: MenuActionEntry, params: MenuInvokeParams) => void | Promise<void>;

export type MenuEntriesContextValue = {
  iconSize: IconButtonProps['size'];
  /** Identifies the component that owns the menu; passed to every invocation. */
  caller?: string;
  /** Runs an entry. Defaults to the entry's own `invoke`. */
  onAction?: MenuEntryExecutor;
  useEntries: MenuEntriesHook;
};

const useNoEntries: MenuEntriesHook = () => undefined;

const MenuEntriesContext = createContext<MenuEntriesContextValue>({ iconSize: 5, useEntries: useNoEntries });

export const useMenuEntriesContext = (): MenuEntriesContextValue => useContext(MenuEntriesContext);

export type MenuEntriesProviderProps = PropsWithChildren<Partial<MenuEntriesContextValue>>;

/** A nested provider inherits what it does not set, so a subtree can override only the caller. */
export const MenuEntriesProvider = ({ children, iconSize, caller, onAction, useEntries }: MenuEntriesProviderProps) => {
  const parent = useContext(MenuEntriesContext);
  const value = useMemo<MenuEntriesContextValue>(
    () => ({
      iconSize: iconSize ?? parent.iconSize,
      caller: caller ?? parent.caller,
      onAction: onAction ?? parent.onAction,
      useEntries: useEntries ?? parent.useEntries,
    }),
    [parent, iconSize, caller, onAction, useEntries],
  );

  return <MenuEntriesContext.Provider value={value}>{children}</MenuEntriesContext.Provider>;
};

/** The entries to render: the explicit list when given, otherwise the group's from the source. */
export const useMenuEntries = (group?: MenuGroupEntry, entries?: MenuEntry[]): MenuEntry[] | undefined => {
  const { useEntries } = useMenuEntriesContext();
  const resolved = useEntries(group);
  return entries ?? resolved;
};

/** Runs an entry through the context's executor, with the context's caller. */
export const useMenuEntryInvoke = () => {
  const { onAction, caller } = useMenuEntriesContext();
  return useCallback(
    async (entry: MenuActionEntry, params: Omit<MenuInvokeParams, 'caller'> = {}): Promise<void> => {
      const invocation: MenuInvokeParams = { caller, ...params };
      await (onAction ? onAction(entry, invocation) : entry.invoke?.(invocation));
    },
    [onAction, caller],
  );
};

//
// Label
//

export const MenuEntryLabel = ({ entry }: { entry: MenuLabelledEntry }) => {
  const { t } = useTranslation();
  const shortcut = getMenuEntryShortcut(entry);
  return (
    <>
      <span className='grow truncate'>{toLocalizedString(entry.properties.label, t)}</span>
      {shortcut && <span className='shrink-0 text-description'>{keySymbols(shortcut).join('')}</span>}
    </>
  );
};

//
// Dropdown entries
//

const isMultiSelect = (group?: MenuGroupEntry): boolean =>
  !!group && 'selectCardinality' in group.properties && group.properties.selectCardinality === 'multiple';

const DropdownMenuActionEntry = ({ entry, group }: { entry: MenuActionEntry; group?: MenuGroupEntry }) => {
  const { iconSize } = useMenuEntriesContext();
  const invoke = useMenuEntryInvoke();
  const { icon, spin, iconClassNames, disabled, testId, checked } = entry.properties;
  // An entry that declares `checked` is a select-group member: expose the checked role + state to AT so
  // the current value is announced, not conveyed by the trailing check icon alone. Mutually-exclusive
  // (single-select) groups use radio semantics; multi-select groups use checkbox.
  const checkable = typeof checked === 'boolean';
  const multiple = isMultiSelect(group);
  const role = multiple ? 'menuitemcheckbox' : 'menuitemradio';

  const handleClick = useCallback(
    (event: MouseEvent) => {
      if (disabled) {
        return;
      }
      event.stopPropagation();
      void invoke(entry, { parent: group, modifiers: { shift: event.shiftKey } });
    },
    [entry, group, disabled, invoke],
  );

  // A multi-select group is set by toggling several members, so suppress the primitive's
  // close-on-select; picking one value and closing is single-select behaviour.
  const handleSelect = useCallback((event: Event) => multiple && event.preventDefault(), [multiple]);

  return (
    <DropdownMenu.Item
      onClick={handleClick}
      onSelect={handleSelect}
      classNames='gap-2'
      disabled={disabled}
      {...(checkable && { role, 'aria-checked': !!checked })}
      {...(testId && { 'data-testid': testId })}
    >
      {icon && <Icon icon={icon} size={iconSize} classNames={mx(spin && 'animate-spin', iconClassNames)} />}
      <MenuEntryLabel entry={entry} />
      {/* Trailing check marks the current value of a single-select group (`checked`). */}
      {checked && <Icon icon='ph--check--regular' size={iconSize} classNames='ms-auto' />}
    </DropdownMenu.Item>
  );
};

const DropdownMenuGroupEntry = ({ group }: { group: MenuGroupEntry }) => {
  const { iconSize } = useMenuEntriesContext();
  const { icon, testId } = group.properties;
  return (
    <DropdownMenu.Sub>
      <DropdownMenu.SubTrigger classNames='gap-2' {...(testId && { 'data-testid': testId })}>
        {icon && <Icon icon={icon} size={iconSize} />}
        <MenuEntryLabel entry={group} />
        <Icon icon='ph--caret-right--regular' size={iconSize} classNames='ms-auto' />
      </DropdownMenu.SubTrigger>
      <DropdownMenu.Portal>
        <DropdownMenu.SubContent>
          <DropdownMenu.Viewport>
            <DropdownMenuEntries group={group} />
          </DropdownMenu.Viewport>
        </DropdownMenu.SubContent>
      </DropdownMenu.Portal>
    </DropdownMenu.Sub>
  );
};

export type DropdownMenuEntriesProps = {
  /** The group whose entries render; the root's when omitted. */
  group?: MenuGroupEntry;
  /** Explicit entries, instead of the source's. */
  entries?: MenuEntry[];
};

/**
 * The entries of a menu, container-free so they render into whichever viewport holds them: actions as
 * items, groups as submenus, separators as separators.
 */
export const DropdownMenuEntries = ({ group, entries: entriesProp }: DropdownMenuEntriesProps) => {
  const entries = useMenuEntries(group, entriesProp);
  return (
    <>
      {entries?.map((entry) =>
        entry.kind === 'separator' ? (
          <DropdownMenu.Separator key={entry.id} />
        ) : entry.kind === 'group' ? (
          <DropdownMenuGroupEntry key={entry.id} group={entry} />
        ) : (
          <DropdownMenuActionEntry key={entry.id} entry={entry} group={group} />
        ),
      )}
    </>
  );
};

DropdownMenuEntries.displayName = 'DropdownMenu.Entries';
