//
// Copyright 2026 DXOS.org
//

import { type TFunction } from '@dxos/i18n';
import { keySymbols } from '@dxos/react-focus';
import { type MenuActionEntry, type MenuGroupEntry, toLocalizedString } from '@dxos/ui-types';
import { getHostPlatform } from '@dxos/util';

// Kept out of `MenuEntries.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so a value exported beside them forces a full page reload on every edit.

export type MenuLabelledEntry = MenuActionEntry | MenuGroupEntry;

/** The entry's shortcut for this host, if it declares one. */
export const getMenuEntryShortcut = (entry: MenuLabelledEntry): string | undefined => {
  const { keyBinding } = entry.properties;
  return typeof keyBinding === 'string' ? keyBinding : keyBinding?.[getHostPlatform()];
};

/** The entry's label as one string, with the shortcut in parentheses, for `aria-label`s and tooltips. */
export const menuEntryLabel = (entry: MenuLabelledEntry, t: TFunction): string => {
  const shortcut = getMenuEntryShortcut(entry);
  return `${toLocalizedString(entry.properties.label, t)}${shortcut ? ` (${keySymbols(shortcut).join('')})` : ''}`;
};
