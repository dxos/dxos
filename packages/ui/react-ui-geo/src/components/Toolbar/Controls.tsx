//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { IconButton, type ThemedClassName, Toolbar, useTranslation } from '@dxos/react-ui';

import { translationKey } from '#translations';

export type ControlAction = 'toggle' | 'start' | 'zoom-in' | 'zoom-out';

export type ControlProps = ThemedClassName<{
  onAction?: (action: ControlAction) => void;
}>;

export const ZoomControls = ({ classNames, onAction }: ControlProps) => {
  const { t } = useTranslation(translationKey);

  return (
    <Toolbar.Root classNames={['gap-2', classNames]}>
      <IconButton
        icon='ph--plus--regular'
        iconOnly
        label={t('zoom-in-icon.button')}
        onClick={() => onAction?.('zoom-in')}
      />
      <IconButton
        icon='ph--minus--regular'
        iconOnly
        label={t('zoom-out-icon.button')}
        onClick={() => onAction?.('zoom-out')}
      />
    </Toolbar.Root>
  );
};

export const ActionControls = ({ classNames, onAction }: ControlProps) => {
  const { t } = useTranslation(translationKey);

  return (
    <Toolbar.Root classNames={['gap-2', classNames]}>
      <IconButton
        icon='ph--path--regular'
        iconOnly
        label={t('start-icon.button')}
        onClick={() => onAction?.('start')}
      />
      <IconButton
        icon='ph--globe-hemisphere-west--regular'
        iconOnly
        label={t('toggle-icon.button')}
        onClick={() => onAction?.('toggle')}
      />
    </Toolbar.Root>
  );
};
