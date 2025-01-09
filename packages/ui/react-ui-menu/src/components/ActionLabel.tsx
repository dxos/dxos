//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type Action, type ActionGroup } from '@dxos/app-graph';
import { keySymbols } from '@dxos/keyboard';
import { toLocalizedString, useTranslation } from '@dxos/react-ui';
import { mx, descriptionText } from '@dxos/react-ui-theme';

import { type MenuActionProperties } from '../defs';
import { translationKey } from '../translations';
import { getShortcut } from '../util';

export const ActionLabel = ({
  action,
}: {
  action: Action<MenuActionProperties> | ActionGroup<MenuActionProperties>;
}) => {
  const shortcut = getShortcut(action);
  const { t } = useTranslation(translationKey);

  return (
    <>
      <span className='grow truncate'>{toLocalizedString(action.properties!.label, t)}</span>
      {shortcut && <span className={mx('shrink-0', descriptionText)}>{keySymbols(shortcut).join('')}</span>}
    </>
  );
};
