//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import React, { forwardRef } from 'react';

import { type Size } from '../../sizes.ts';
import * as Button from '../Button/Button.tsx';
import * as Menu from '../Menu/Menu.tsx';

/**
 * One entry in a {@link MenuButton}'s menu: a caller describes the menu it wants instead of assembling the Menu parts.
 */
export type MenuButtonItem =
  /** Heading over the entries that follow, up to the next heading or separator; not selectable. */
  | { type: 'group'; label: string }
  | { type: 'separator' }
  /** Single-select entry; consecutive options form one radio group, checked while `selected`. */
  | { type: 'option'; label: string; selected: boolean; onSelect: () => void; testId?: string }
  | { type: 'checkbox'; label: string; checked: boolean; onCheckedChange: (checked: boolean) => void; testId?: string };

type OptionItem = Extract<MenuButtonItem, { type: 'option' }>;
type CheckboxItem = Extract<MenuButtonItem, { type: 'checkbox' }>;

/** A run of the menu between separators: its optional heading, then runs of options and single checkboxes. */
type Section = {
  label?: string;
  entries: (
    | { type: 'options'; options: OptionItem[]; start: number }
    | { type: 'checkbox'; item: CheckboxItem; index: number }
  )[];
};

/** Splits the flat item list into sections, so headings and option runs become Ark groups (and zag owns their ARIA). */
const toSections = (items: MenuButtonItem[]): Section[] => {
  const sections: Section[] = [];
  let section: Section | undefined;
  const current = () => {
    section ??= { entries: [] };
    return section;
  };
  const close = () => {
    if (section) {
      sections.push(section);
      section = undefined;
    }
  };
  items.forEach((item, index) => {
    switch (item.type) {
      case 'separator':
        close();
        sections.push({ entries: [] });
        break;
      case 'group':
        close();
        section = { label: item.label, entries: [] };
        break;
      case 'option': {
        const entries = current().entries;
        const last = entries.at(-1);
        if (last?.type === 'options') {
          last.options.push(item);
        } else {
          entries.push({ type: 'options', options: [item], start: index });
        }
        break;
      }
      case 'checkbox':
        current().entries.push({ type: 'checkbox', item, index });
        break;
    }
  });
  close();
  return sections;
};

export type MenuButtonProps = Omit<Button.ButtonProps, 'onSelect'> & {
  items: MenuButtonItem[];
  /** The menu's size; `md` by default. */
  menuSize?: Size;
};

/**
 * A Button that opens a menu of options and checkboxes: the composite behind every "options" caret in the app. The
 * button is the trigger and nothing else; a caller that wants a primary action pairs it with a Button of its own.
 */
export const MenuButton = forwardRef<HTMLButtonElement, MenuButtonProps>(
  ({ items, menuSize, ...props }, forwardedRef) => (
    <Menu.Root>
      <Menu.Trigger asChild>
        <Button.Button {...props} ref={forwardedRef} />
      </Menu.Trigger>
      <Menu.Content size={menuSize}>
        {toSections(items).map((section, index) =>
          section.entries.length === 0 && section.label === undefined ? (
            index > 0 && <Menu.Separator key={index} />
          ) : (
            <MenuButtonSection key={index} section={section} />
          ),
        )}
      </Menu.Content>
    </Menu.Root>
  ),
);

MenuButton.displayName = 'MenuButton';

const MenuButtonSection = ({ section }: { section: Section }) => {
  const [only] = section.entries;
  // A heading over one run of options names that radio group itself, rather than a group around it.
  if (section.entries.length === 1 && only.type === 'options') {
    return <OptionGroup label={section.label} options={only.options} start={only.start} />;
  }

  const entries = section.entries.map((entry, index) =>
    entry.type === 'options' ? (
      <OptionGroup key={index} options={entry.options} start={entry.start} />
    ) : (
      <Menu.CheckboxItem
        key={index}
        item={{ value: `checkbox-${entry.index}`, label: entry.item.label }}
        checked={entry.item.checked}
        onCheckedChange={entry.item.onCheckedChange}
        data-testid={entry.item.testId}
      />
    ),
  );
  return section.label === undefined ? (
    <>{entries}</>
  ) : (
    <Menu.ItemGroup>
      <Menu.ItemGroupLabel>{section.label}</Menu.ItemGroupLabel>
      {entries}
    </Menu.ItemGroup>
  );
};

/** Consecutive options as one radio group, whose value is the selected option's position in the item list. */
const OptionGroup = ({ label, options, start }: { label?: string; options: OptionItem[]; start: number }) => {
  const value = (index: number) => `option-${start + index}`;
  const selected = options.findIndex((option) => option.selected);
  return (
    <Menu.RadioItemGroup
      value={selected === -1 ? '' : value(selected)}
      onValueChange={({ value: next }) => options.find((_, index) => value(index) === next)?.onSelect()}
    >
      {label !== undefined && <Menu.ItemGroupLabel>{label}</Menu.ItemGroupLabel>}
      {options.map((option, index) => (
        <Menu.RadioItem key={index} item={{ value: value(index), label: option.label }} data-testid={option.testId}>
          <Menu.ItemIndicator />
          <Menu.ItemText />
        </Menu.RadioItem>
      ))}
    </Menu.RadioItemGroup>
  );
};
