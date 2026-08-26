//
// Copyright 2025 DXOS.org
//

import type * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import { keySymbols } from '@dxos/keyboard';
import { type TFunction, toLocalizedString } from '@dxos/react-ui';
import { type MenuActionProperties, type MenuItemChrome } from '@dxos/ui-types';

import { getShortcut } from '../util';

type Action = AppGraphNode.Action<MenuActionProperties> | AppGraphNode.ActionGroup<MenuItemChrome>;

// Kept out of `ActionLabel.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so a value exported beside them forces a full page reload on every edit.

export const actionLabel = (action: Action, t: TFunction) => {
  const shortcut = getShortcut(action);
  return `${toLocalizedString(action.properties!.label, t)}${shortcut ? ` (${keySymbols(shortcut).join('')})` : ''}`;
};
