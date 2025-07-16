//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type Action as GraphAction, type ActionGroup } from '@dxos/app-graph';
import { keySymbols } from '@dxos/keyboard';
import { toLocalizedString, useTranslation, type TFunction } from '@dxos/react-ui';
import { mx, descriptionText } from '@dxos/react-ui-theme';

import { translationKey } from '../translations';
import { type MenuActionProperties } from '../types';
import { getShortcut } from '../util';

type Action = GraphAction<MenuActionProperties> | ActionGroup<Omit<MenuActionProperties, 'variant'>>;

export const ActionLabel = ({ action }: { action: Action }) => {
  const { t } = useTranslation(translationKey);
  const shortcut = getShortcut(action);
  return (
    <>
      <span className='grow truncate'>{toLocalizedString(action.properties!.label, t)}</span>
      {shortcut && <span className={mx('shrink-0', descriptionText)}>{keySymbols(shortcut).join('')}</span>}
    </>
  );
};

export const actionLabel = (action: Action, t: TFunction) => {
  const shortcut = getShortcut(action);
  return `${toLocalizedString(action.properties!.label, t)}${shortcut ? ` (${keySymbols(shortcut).join('')})` : ''}`;
};
