//
// Copyright 2025 DXOS.org
//

import type * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import { keySymbols } from '@dxos/react-focus';
import * as ThemeProvider from '@dxos/react-ui/ThemeProvider';
import { type MenuActionProperties, type MenuItemChrome } from '@dxos/ui-types';

import { getShortcut } from '../util.ts';

type Action = AppGraphNode.Action<MenuActionProperties> | AppGraphNode.ActionGroup<MenuItemChrome>;

// Kept out of `ActionLabel.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so a value exported beside them forces a full page reload on every edit.

export const actionLabel = (action: Action, t: ThemeProvider.TFunction) => {
  const shortcut = getShortcut(action);
  return `${ThemeProvider.toLocalizedString(action.properties!.label, t)}${shortcut ? ` (${keySymbols(shortcut).join('')})` : ''}`;
};
