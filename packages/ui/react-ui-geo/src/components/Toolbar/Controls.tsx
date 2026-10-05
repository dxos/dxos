//
// Copyright 2025 DXOS.org
//

import React from 'react';

import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import type * as Util from '@dxos/react-ui/Util';

import { translationKey } from '#translations';

export type ControlAction = 'toggle' | 'start' | 'zoom-in' | 'zoom-out';

export type ControlProps = Util.ThemedClassName<{
  onAction?: (action: ControlAction) => void;
}>;

export const ZoomControls = ({ classNames, onAction }: ControlProps) => {
  const { t } = Hooks.useTranslation(translationKey);

  return (
    <Toolbar.Root classNames={['gap-2', classNames]}>
      <Button.Root
        icon='ph--plus--regular'
        iconOnly
        label={t('zoom-in-icon.button')}
        onClick={() => onAction?.('zoom-in')}
      />
      <Button.Root
        icon='ph--minus--regular'
        iconOnly
        label={t('zoom-out-icon.button')}
        onClick={() => onAction?.('zoom-out')}
      />
    </Toolbar.Root>
  );
};

export const ActionControls = ({ classNames, onAction }: ControlProps) => {
  const { t } = Hooks.useTranslation(translationKey);

  return (
    <Toolbar.Root classNames={['gap-2', classNames]}>
      <Button.Root
        icon='ph--path--regular'
        iconOnly
        label={t('start-icon.button')}
        onClick={() => onAction?.('start')}
      />
      <Button.Root
        icon='ph--globe-hemisphere-west--regular'
        iconOnly
        label={t('toggle-icon.button')}
        onClick={() => onAction?.('toggle')}
      />
    </Toolbar.Root>
  );
};
