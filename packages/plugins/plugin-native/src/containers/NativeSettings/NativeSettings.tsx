//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';
import * as Match from 'effect/Match';
import * as Schema from 'effect/Schema';
import React, { type ReactNode, useState } from 'react';

import { useCapability } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Button, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

import { meta } from '#meta';
import { NativeCapabilities, type Settings, type Update } from '#types';

export type NativeSettingsProps = AppSurface.SettingsProps<Settings.Settings>;

type Pending = null | 'check' | 'install' | 'relaunch';

type UpdateActions = {
  onCheck: () => Promise<void>;
  onInstall: () => Promise<void>;
  onRelaunch: () => Promise<void>;
};

type UpdateRow = { description: string; button: ReactNode };

export const NativeSettings = (_props: NativeSettingsProps) => {
  const { t } = useTranslation(meta.profile.key);
  const manager = useCapability(NativeCapabilities.UpdateManager);
  const status = useAtomValue(manager.status);

  // UI-level pending flag. The status atom can flip between `checking` and `up-to-date` faster
  // than the user can perceive, so we also gate the button on the click handler's lifetime to
  // guarantee no duplicate triggers and a visible busy state.
  const [pending, setPending] = useState<Pending>(null);

  const runAction = (kind: Exclude<Pending, null>, action: () => Promise<void>) => async () => {
    setPending(kind);
    try {
      await action();
    } finally {
      setPending(null);
    }
  };

  const { description, button } = renderUpdateRow(status, pending, t, {
    onCheck: runAction('check', manager.check),
    onInstall: runAction('install', manager.install),
    onRelaunch: runAction('relaunch', manager.relaunch),
  });

  return (
    <Form.Root schema={Schema.Struct({})} values={{}} variant='settings'>
      <Form.Viewport scroll>
        <Form.Content>
          <Form.Section title={meta.profile.name ?? meta.profile.key}>
            <Form.Row label={t('settings.updates.label')} description={description}>
              {button}
            </Form.Row>
          </Form.Section>
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};

const renderUpdateRow = (
  status: Update.Status,
  pending: Pending,
  t: (key: string, options?: Record<string, unknown>) => string,
  { onCheck, onInstall, onRelaunch }: UpdateActions,
): UpdateRow => {
  const isChecking = pending === 'check' || status.kind === 'checking';
  const isInstalling = pending === 'install' || status.kind === 'downloading';

  const checkButton = (disabled = false) => (
    <Button disabled={disabled || isChecking || isInstalling || pending === 'relaunch'} onClick={() => void onCheck()}>
      {isChecking ? t('settings.updates.checking.label') : t('settings.updates.check.label')}
    </Button>
  );

  return Match.value(status).pipe(
    Match.withReturnType<UpdateRow>(),
    Match.when({ kind: 'unsupported' }, () => ({
      description: t('settings.updates.unsupported.message'),
      button: checkButton(true),
    })),
    Match.when({ kind: 'idle' }, () => ({
      description: isChecking ? t('settings.updates.checking.message') : t('settings.updates.idle.message'),
      button: checkButton(),
    })),
    Match.when({ kind: 'checking' }, () => ({
      description: t('settings.updates.checking.message'),
      button: checkButton(),
    })),
    Match.when({ kind: 'up-to-date' }, (s) => ({
      description: isChecking
        ? t('settings.updates.checking.message')
        : t('settings.updates.up-to-date.message', {
            checkedAt: formatDistanceToNow(new Date(s.checkedAt), { addSuffix: true }),
          }),
      button: checkButton(),
    })),
    Match.when({ kind: 'available' }, (s) => ({
      description: t('settings.updates.available.message', { version: s.version }),
      button: (
        <Button variant='primary' disabled={isInstalling} onClick={() => void onInstall()}>
          {isInstalling ? t('settings.updates.downloading.label') : t('settings.updates.update-now.label')}
        </Button>
      ),
    })),
    Match.when({ kind: 'downloading' }, (s) => {
      const percent = s.contentLength > 0 ? Math.round((s.downloaded / s.contentLength) * 100) : 0;
      return {
        description: t('settings.updates.downloading.message', { percent }),
        button: <Button disabled>{t('settings.updates.downloading.label')}</Button>,
      };
    }),
    Match.when({ kind: 'ready' }, () => ({
      description: t('settings.updates.ready.message'),
      button: (
        <Button variant='primary' disabled={pending === 'relaunch'} onClick={() => void onRelaunch()}>
          {t('settings.updates.relaunch.label')}
        </Button>
      ),
    })),
    Match.when({ kind: 'failed' }, (s) => ({
      description: t('settings.updates.failed.message', { error: s.error }),
      button: checkButton(),
    })),
    Match.exhaustive,
  );
};

NativeSettings.displayName = 'NativeSettings';
