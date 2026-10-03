//
// Copyright 2025 DXOS.org
//

import React from 'react';

import type * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import { keySymbols } from '@dxos/react-focus';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as ThemeProvider from '@dxos/react-ui/ThemeProvider';
import { mx } from '@dxos/ui-theme';
import { type MenuActionProperties, type MenuItemChrome } from '@dxos/ui-types';

import { translationKey } from '#translations';

import { getShortcut } from '../util.ts';

type Action = AppGraphNode.Action<MenuActionProperties> | AppGraphNode.ActionGroup<MenuItemChrome>;

export const ActionLabel = ({ action }: { action: Action }) => {
  const { t } = Hooks.useTranslation(translationKey);
  const shortcut = getShortcut(action);
  return (
    <>
      <span className='grow truncate'>{ThemeProvider.toLocalizedString(action.properties!.label, t)}</span>
      {shortcut && <span className={mx('shrink-0', 'text-fg-muted')}>{keySymbols(shortcut).join('')}</span>}
    </>
  );
};
