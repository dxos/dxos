//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type Node } from '@dxos/app-graph';
import { keySymbols } from '@dxos/keyboard';
import { type TFunction, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { descriptionText, mx } from '@dxos/ui-theme';
import { type MenuActionProperties } from '@dxos/ui-types';

import { translationKey } from '../translations';
import { getShortcut } from '../util';

type Action = Node.Action<MenuActionProperties> | Node.ActionGroup<Omit<MenuActionProperties, 'variant'>>;

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
