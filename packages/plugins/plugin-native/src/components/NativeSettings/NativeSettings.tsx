//
// Copyright 2025 DXOS.org
//

import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';
import React, { type ReactNode, useState } from 'react';

import { useAtomCapability, useCapability } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Button, useTranslation } from '@dxos/react-ui';
import { Settings as SettingsForm } from '@dxos/react-ui-form';

import { meta } from '#meta';
import { NativeCapabilities, type Settings, type Update } from '#types';

export type NativeSettingsProps = AppSurface.SettingsArticleProps<Settings.Settings>;

export const NativeSettings = (_props: NativeSettingsProps) => {
  const { t } = useTranslation(meta.id);
  const status = useAtomCapability(NativeCapabilities.UpdateStatus);
  const checkForUpdates = useCapability(NativeCapabilities.CheckForUpdates);
  const installUpdate = useCapability(NativeCapabilities.InstallUpdate);
  const relaunchApp = useCapability(NativeCapabilities.RelaunchApp);

  // UI-level pending flag. The status atom can flip between `checking` and `up-to-date` faster
  // than the user can perceive, so we also gate the button on the click handler's lifetime to
  // guarantee no duplicate triggers and a visible busy state.
  const [pending, setPending] = useState<null | 'check' | 'install' | 'relaunch'>(null);

  const runAction = (kind: 'check' | 'install' | 'relaunch', action: () => Promise<void>) => async () => {
    setPending(kind);
    try {
      await action();
    } finally {
      setPending(null);
    }
  };

  const { description, button } = renderUpdateRow(status, pending, t, {
    onCheck: runAction('check', checkForUpdates),
    onInstall: runAction('install', installUpdate),
    onRelaunch: runAction('relaunch', relaunchApp),
  });

  return (
    <SettingsForm.Viewport>
      <SettingsForm.Section title={t('settings.title')}>
        <SettingsForm.Item title={t('settings.updates.label')} description={description}>
          {button}
        </SettingsForm.Item>
      </SettingsForm.Section>
    </SettingsForm.Viewport>
  );
};

type UpdateActions = {
  onCheck: () => Promise<void>;
  onInstall: () => Promise<void>;
  onRelaunch: () => Promise<void>;
};

const renderUpdateRow = (
  status: Update.Status,
  pending: null | 'check' | 'install' | 'relaunch',
  t: (key: string, options?: Record<string, unknown>) => string,
  { onCheck, onInstall, onRelaunch }: UpdateActions,
): { description: string; button: ReactNode } => {
  const isChecking = pending === 'check' || status.kind === 'checking';
  const isInstalling = pending === 'install' || status.kind === 'downloading';

  const checkButton = (disabled = false) => (
    <Button disabled={disabled || isChecking || isInstalling || pending === 'relaunch'} onClick={() => void onCheck()}>
      {isChecking ? t('settings.updates.checking.label') : t('settings.updates.check.label')}
    </Button>
  );

  switch (status.kind) {
    case 'unsupported':
      return {
        description: t('settings.updates.unsupported.message'),
        button: checkButton(true),
      };
    case 'idle':
      return {
        description: isChecking ? t('settings.updates.checking.message') : t('settings.updates.idle.message'),
        button: checkButton(),
      };
    case 'checking':
      return {
        description: t('settings.updates.checking.message'),
        button: checkButton(),
      };
    case 'up-to-date':
      return {
        description: isChecking
          ? t('settings.updates.checking.message')
          : t('settings.updates.up-to-date.message', {
              checkedAt: formatDistanceToNow(new Date(status.checkedAt), { addSuffix: true }),
            }),
        button: checkButton(),
      };
    case 'available':
      return {
        description: t('settings.updates.available.message', { version: status.version }),
        button: (
          <Button variant='primary' disabled={isInstalling} onClick={() => void onInstall()}>
            {isInstalling ? t('settings.updates.downloading.label') : t('settings.updates.update-now.label')}
          </Button>
        ),
      };
    case 'downloading': {
      const percent = status.contentLength > 0 ? Math.round((status.downloaded / status.contentLength) * 100) : 0;
      return {
        description: t('settings.updates.downloading.message', { percent }),
        button: <Button disabled>{t('settings.updates.downloading.label')}</Button>,
      };
    }
    case 'ready':
      return {
        description: t('settings.updates.ready.message'),
        button: (
          <Button variant='primary' disabled={pending === 'relaunch'} onClick={() => void onRelaunch()}>
            {t('settings.updates.relaunch.label')}
          </Button>
        ),
      };
    case 'failed':
      return {
        description: t('settings.updates.failed.message', { error: status.error }),
        button: checkButton(),
      };
  }
};
