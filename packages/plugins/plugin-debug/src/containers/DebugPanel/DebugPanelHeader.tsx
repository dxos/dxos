//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type IconButtonProps, Toolbar, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';

import { type DebugPanelMode } from './view-state.ts';

export type DebugPanelHeaderProps = Pick<IconButtonProps, 'density'> & {
  mode: DebugPanelMode;
  onModeChange: (mode: DebugPanelMode) => void;
  /** Omitted where the host brings its own close (the floating window's `CloseTrigger`). */
  onClose?: () => void;
};

/**
 * The title-bar controls both hosts share: the dock/float switch, and a close for a host without one
 * of its own. The button says what it does next, so the icon flips with the mode.
 */
export const DebugPanelHeader = ({ mode, onModeChange, onClose, density }: DebugPanelHeaderProps) => {
  const { t } = useTranslation(meta.profile.key);
  const floating = mode === 'floating';
  return (
    <>
      <Toolbar.IconButton
        variant='ghost'
        density={density}
        iconOnly
        icon={floating ? 'ph--arrow-square-in--regular' : 'ph--arrow-square-out--regular'}
        label={floating ? t('dock-panel.label') : t('float-panel.label')}
        data-testid='debugPanel.mode'
        onClick={() => onModeChange(floating ? 'docked' : 'floating')}
      />
      {onClose && (
        <Toolbar.IconButton
          variant='ghost'
          density={density}
          iconOnly
          icon='ph--x--regular'
          label={t('close-panel.label')}
          data-testid='debugPanel.close'
          onClick={onClose}
        />
      )}
    </>
  );
};

DebugPanelHeader.displayName = 'DebugPanelHeader';
