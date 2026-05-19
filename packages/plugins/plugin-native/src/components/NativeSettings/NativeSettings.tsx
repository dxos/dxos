//
// Copyright 2025 DXOS.org
//

import React, { type ReactNode } from 'react';

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

  const { description, button } = renderUpdateRow(status, t, { checkForUpdates, installUpdate, relaunchApp });

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
  checkForUpdates: () => Promise<void>;
  installUpdate: () => Promise<void>;
  relaunchApp: () => Promise<void>;
};

const renderUpdateRow = (
  status: Update.Status,
  t: (key: string, options?: Record<string, unknown>) => string,
  { checkForUpdates, installUpdate, relaunchApp }: UpdateActions,
): { description: string; button: ReactNode } => {
  const checkButton = (disabled = false) => (
    <Button disabled={disabled} onClick={() => void checkForUpdates()}>
      {t('settings.updates.check.label')}
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
        description: t('settings.updates.idle.message'),
        button: checkButton(),
      };
    case 'checking':
      return {
        description: t('settings.updates.checking.message'),
        button: checkButton(true),
      };
    case 'up-to-date':
      return {
        description: t('settings.updates.up-to-date.message'),
        button: checkButton(),
      };
    case 'available':
      return {
        description: t('settings.updates.available.message', { version: status.version }),
        button: (
          <Button variant='primary' onClick={() => void installUpdate()}>
            {t('settings.updates.update-now.label')}
          </Button>
        ),
      };
    case 'downloading': {
      const percent =
        status.contentLength > 0 ? Math.round((status.downloaded / status.contentLength) * 100) : 0;
      return {
        description: t('settings.updates.downloading.message', { percent }),
        button: <Button disabled>{t('settings.updates.update-now.label')}</Button>,
      };
    }
    case 'ready':
      return {
        description: t('settings.updates.ready.message'),
        button: (
          <Button variant='primary' onClick={() => void relaunchApp()}>
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
