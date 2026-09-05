//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { mx } from '@dxos/ui-theme';
import {
  type DropdownMenuItemGroupProperties,
  type MenuActionEntry,
  type MenuEntry,
  type MenuGroupEntry,
  type ToggleGroupMenuItemGroupProperties,
  toLocalizedString,
} from '@dxos/ui-types';

import { Input } from '../Input';
import {
  DropdownMenu,
  DropdownMenuEntries,
  MenuEntryLabel,
  menuEntryLabel,
  useMenuEntries,
  useMenuEntriesContext,
  useMenuEntryInvoke,
} from '../Menu';
import { Tooltip } from '../Tooltip';
import { ToolbarParts as Toolbar } from './Toolbar';

const ActionEntry = ({ entry }: { entry: MenuActionEntry }) => {
  const { iconSize } = useMenuEntriesContext();
  const invoke = useMenuEntryInvoke();
  const { t } = useTranslation();
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);

  const { icon, iconOnly = true, disabled, testId, hidden, classNames, iconClassNames, spin } = entry.properties;
  const variant = entry.properties.variant === 'primary' ? ('primary' as const) : ('ghost' as const);

  // One invocation at a time: the button is disabled until the last one settles.
  const handleClick = useCallback(() => {
    if (pendingRef.current) {
      return;
    }
    pendingRef.current = true;
    setPending(true);
    const done = () => {
      pendingRef.current = false;
      setPending(false);
    };
    invoke(entry).then(done, done);
  }, [entry, invoke]);

  if (hidden) {
    return null;
  }

  const commonProps = {
    variant,
    disabled: disabled || pending,
    classNames,
    onClick: handleClick,
    ...(testId && { 'data-testid': testId }),
  };

  return icon ? (
    <Toolbar.IconButton
      {...commonProps}
      icon={icon}
      size={iconSize}
      iconOnly={iconOnly}
      iconClassNames={mx(spin && 'animate-spin', iconClassNames)}
      label={menuEntryLabel(entry, t)}
    />
  ) : (
    <Toolbar.Button {...commonProps}>
      <MenuEntryLabel entry={entry} />
    </Toolbar.Button>
  );
};

const SwitchEntry = ({ entry }: { entry: MenuActionEntry }) => {
  const invoke = useMenuEntryInvoke();
  const { t } = useTranslation();
  const { label, iconOnly, disabled, testId, hidden, checked } = entry.properties;
  const labelString = toLocalizedString(label, t);

  const handleCheckedChange = useCallback(() => void invoke(entry), [entry, invoke]);

  if (hidden) {
    return null;
  }

  const control = (
    <Input.Switch
      checked={checked}
      disabled={disabled}
      aria-label={iconOnly ? labelString : undefined}
      onCheckedChange={handleCheckedChange}
      {...(testId && { 'data-testid': testId })}
    />
  );

  return (
    <Input.Root>
      {iconOnly ? (
        <Tooltip.Trigger asChild content={labelString}>
          <Input.Block>{control}</Input.Block>
        </Tooltip.Trigger>
      ) : (
        <Input.Block>{control}</Input.Block>
      )}
      {!iconOnly && <Input.Label>{labelString}</Input.Label>}
    </Input.Root>
  );
};

const DropdownGroupEntry = ({ group }: { group: MenuGroupEntry<DropdownMenuItemGroupProperties> }) => {
  const { iconSize } = useMenuEntriesContext();
  const { t } = useTranslation();
  const entries = useMenuEntries(group);
  const {
    iconOnly,
    disabled,
    testId,
    applyActive,
    caretDown = true,
    icon: groupIcon,
    iconClassNames: groupIconClassNames,
    spin: groupSpin,
  } = group.properties;

  const activeEntry = entries?.find(
    (entry): entry is MenuActionEntry => entry.kind === 'action' && !!entry.properties.checked,
  );
  const icon = (applyActive && activeEntry?.properties.icon) || groupIcon;
  // Follow the same `applyActive` rule for `iconClassNames` so a per-entry accent (e.g. tag colour) tracks the displayed icon.
  const iconClassNames = (applyActive && activeEntry?.properties.iconClassNames) || groupIconClassNames;
  const spin = (applyActive && activeEntry?.properties.spin) || groupSpin;
  const labelEntry = applyActive && activeEntry ? activeEntry : group;

  const trigger = icon ? (
    <Toolbar.IconButton
      variant='ghost'
      disabled={disabled}
      icon={icon}
      size={iconSize}
      iconOnly={iconOnly}
      iconClassNames={mx(spin && 'animate-spin', iconClassNames)}
      label={menuEntryLabel(labelEntry, t)}
      caretDown={caretDown && !disabled}
      {...(testId && { 'data-testid': testId })}
    />
  ) : (
    <Toolbar.Button
      variant='ghost'
      disabled={disabled}
      caretDown={caretDown && !disabled}
      {...(testId && { 'data-testid': testId })}
    >
      <MenuEntryLabel entry={labelEntry} />
    </Toolbar.Button>
  );

  // No menu behind a disabled trigger, since `disabled` alone does not gate the machine's open handler and the
  // group presented an empty dropdown.
  if (disabled) {
    return trigger;
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content>
          <DropdownMenu.Viewport>
            <DropdownMenuEntries group={group} entries={entries} />
          </DropdownMenu.Viewport>
          <DropdownMenu.Arrow />
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};

const ToggleGroupItemEntry = ({
  group,
  entry,
}: {
  group: MenuGroupEntry<ToggleGroupMenuItemGroupProperties>;
  entry: MenuActionEntry;
}) => {
  const { iconSize } = useMenuEntriesContext();
  const invoke = useMenuEntryInvoke();
  const { t } = useTranslation();
  const { icon, iconOnly = true, disabled, testId, hidden, classNames, iconClassNames, spin } = entry.properties;

  const handleClick = useCallback(() => void invoke(entry, { parent: group }), [entry, group, invoke]);

  if (hidden) {
    return null;
  }

  const commonProps = {
    value: entry.id,
    disabled,
    variant: 'ghost' as const,
    classNames,
    onClick: handleClick,
    ...(testId && { 'data-testid': testId }),
  };

  return icon ? (
    <Toolbar.ToggleGroupIconItem
      {...commonProps}
      icon={icon}
      size={iconSize}
      iconOnly={iconOnly}
      iconClassNames={mx(spin && 'animate-spin', iconClassNames)}
      label={menuEntryLabel(entry, t)}
    />
  ) : (
    <Toolbar.ToggleGroupItem {...commonProps}>
      <MenuEntryLabel entry={entry} />
    </Toolbar.ToggleGroupItem>
  );
};

const ToggleGroupEntry = ({ group }: { group: MenuGroupEntry<ToggleGroupMenuItemGroupProperties> }) => {
  const entries = useMenuEntries(group);
  const children = entries
    ?.filter((entry): entry is MenuActionEntry => entry.kind === 'action')
    .map((entry) => <ToggleGroupItemEntry key={entry.id} group={group} entry={entry} />);

  return group.properties.selectCardinality === 'multiple' ? (
    <Toolbar.ToggleGroup type='multiple' value={group.properties.value}>
      {children}
    </Toolbar.ToggleGroup>
  ) : (
    <Toolbar.ToggleGroup type='single' value={group.properties.value}>
      {children}
    </Toolbar.ToggleGroup>
  );
};

const ToolbarEntry = ({ entry }: { entry: MenuEntry }) => {
  if (entry.kind === 'separator') {
    return <Toolbar.Separator variant={entry.properties.variant} />;
  }

  if (entry.kind === 'group') {
    return entry.properties.variant === 'dropdownMenu' ? (
      <DropdownGroupEntry group={entry as MenuGroupEntry<DropdownMenuItemGroupProperties>} />
    ) : (
      <ToggleGroupEntry group={entry as MenuGroupEntry<ToggleGroupMenuItemGroupProperties>} />
    );
  }

  if (entry.properties.variant === 'switch') {
    return <SwitchEntry entry={entry} />;
  }

  // The contributor owns the rendered element (interactions the entry model cannot express).
  if (entry.properties.variant === 'custom' && entry.properties.render) {
    return <>{entry.properties.render()}</>;
  }

  return <ActionEntry entry={entry} />;
};

export type ToolbarEntriesProps = {
  /** Explicit entries, instead of the source's root entries. */
  entries?: MenuEntry[];
};

/**
 * A toolbar's entries, container-free so JSX order among `Toolbar.Root`'s children places them: actions as
 * buttons or switches, groups as dropdowns or toggle groups, separators as gaps or lines.
 */
export const ToolbarEntries = ({ entries: entriesProp }: ToolbarEntriesProps) => {
  const entries = useMenuEntries(undefined, entriesProp);
  return (
    <>
      {entries?.map((entry) => (
        <ToolbarEntry key={entry.id} entry={entry} />
      ))}
    </>
  );
};

ToolbarEntries.displayName = 'Toolbar.Entries';
