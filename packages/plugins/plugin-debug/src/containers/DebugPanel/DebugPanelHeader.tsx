//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';

import { meta } from '#meta';

import { type DebugPanelMode } from './view-state.ts';

export type DebugPanelHeaderProps = Pick<Button.ButtonProps, 'size'> & {
  mode: DebugPanelMode;
  onModeChange: (mode: DebugPanelMode) => void;
  /** Omitted where the host brings its own close (the floating window's `CloseTrigger`). */
  onClose?: () => void;
};

/**
 * The title-bar controls both hosts share: the dock/float switch, and a close for a host without one
 * of its own. The button says what it does next, so the icon flips with the mode.
 */
export const DebugPanelHeader = ({ mode, onModeChange, onClose, size }: DebugPanelHeaderProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const floating = mode === 'floating';
  return (
    <>
      <Button.Button
        variant='ghost'
        size={size}
        iconOnly
        icon={floating ? 'ph--arrow-square-in--regular' : 'ph--arrow-square-out--regular'}
        label={floating ? t('dock-panel.label') : t('float-panel.label')}
        data-testid='debugPanel.mode'
        onClick={() => onModeChange(floating ? 'docked' : 'floating')}
      />
      {onClose && (
        <Button.Button
          variant='ghost'
          size={size}
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
