//
// Copyright 2025 DXOS.org
//

import React from 'react';

import type * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import { keySymbols } from '@dxos/keyboard';
import { toLocalizedString, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';
import { type MenuActionProperties, type MenuItemChrome } from '@dxos/ui-types';

import { translationKey } from '#translations';

import { getShortcut } from '../util';

type Action = AppGraphNode.Action<MenuActionProperties> | AppGraphNode.ActionGroup<MenuItemChrome>;

export const ActionLabel = ({ action }: { action: Action }) => {
  const { t } = useTranslation(translationKey);
  const shortcut = getShortcut(action);
  return (
    <>
      <span className='grow truncate'>{toLocalizedString(action.properties!.label, t)}</span>
      {shortcut && <span className={mx('shrink-0', 'text-description')}>{keySymbols(shortcut).join('')}</span>}
    </>
  );
};
