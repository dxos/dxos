//
// Copyright 2025 DXOS.org
//

import React from 'react';
import { type Node } from '@dxos/app-graph';
import { keySymbols } from '@dxos/keyboard';
import { type TFunction, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';
import { type MenuActionProperties, type MenuItemChrome } from '@dxos/ui-types';
import { translationKey } from '#translations';
import { getShortcut } from '../util';

type Action = Node.Action<MenuActionProperties> | Node.ActionGroup<MenuItemChrome>;

// Kept out of `ActionLabel.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so a value exported beside them forces a full page reload on every edit.

export const actionLabel = (action: Action, t: TFunction) => {
  const shortcut = getShortcut(action);
  return `${toLocalizedString(action.properties!.label, t)}${shortcut ? ` (${keySymbols(shortcut).join('')})` : ''}`;
};
