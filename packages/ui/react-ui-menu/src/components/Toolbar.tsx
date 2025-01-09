//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { keySymbols } from '@dxos/keyboard';
import { Toolbar as NaturalToolbar, useTranslation, toLocalizedString } from '@dxos/react-ui';
import { mx, descriptionText } from '@dxos/react-ui-theme';

import { type MenuProps } from '../defs';
import { translationKey } from '../translations';
import { getShortcut } from '../util';

export type ToolbarProps = PropsWithChildren<MenuProps>;

export const Toolbar = ({ actions, onAction }: ToolbarProps) => {
  const { t } = useTranslation(translationKey);
  return (
    <NaturalToolbar.Root>
      {actions?.map((action) => {
        const shortcut = getShortcut(action);
        return (
          <NaturalToolbar.IconButton
            key={action.id}
            iconOnly
            variant='ghost'
            icon={action.properties!.icon}
            label={
              <>
                <span className='grow truncate'>{toLocalizedString(action.properties!.label, t)}</span>
                {shortcut && <span className={mx('shrink-0', descriptionText)}>{keySymbols(shortcut).join('')}</span>}
              </>
            }
            disabled={action.properties?.disabled}
            onClick={() => {
              if (action.properties?.disabled) {
                return;
              }
              onAction?.(action);
            }}
            {...(action.properties?.testId && { 'data-testid': action.properties.testId })}
          />
        );
      })}
    </NaturalToolbar.Root>
  );
};
