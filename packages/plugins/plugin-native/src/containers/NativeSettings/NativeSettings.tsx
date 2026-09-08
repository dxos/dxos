//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';
import * as Match from 'effect/Match';
import * as Schema from 'effect/Schema';
import React, { type ReactNode, useState } from 'react';

import { useCapability } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Button, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

import { meta } from '#meta';
import { NativeCapabilities, Settings, Update } from '#types';

export type NativeSettingsProps = AppSurface.SettingsProps<Settings.Settings>;

type Pending = null | 'check' | 'install' | 'relaunch';

type UpdateActions = {
  onCheck: () => Promise<void>;
  onInstall: () => Promise<void>;
  onRelaunch: () => Promise<void>;
};

type UpdateRow = {
  description: string;
  button: ReactNode;
};

/** Update status comes from the update-manager capability, so this panel takes no settings props. */
export const NativeSettings = () => {
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
    // `install` is optional on the shared manager because the web has no separate download step
    // (see AppUpdate.Manager); the native updater always supplies one, and the `available` state that
    // reaches this handler is only reachable where it does.
    onInstall: runAction('install', () => manager.install?.() ?? Promise.resolve()),
    onRelaunch: runAction('relaunch', manager.apply),
  });

  return (
    <Form.Root schema={Schema.Struct({})} values={{}} variant='settings'>
      <Form.Viewport scroll>
        <Form.Content>
          <Form.Section title={meta.profile.name ?? meta.profile.key}>
            <Form.Field label={t('settings.updates.label')} description={description}>
              {button}
            </Form.Field>
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
    Match.when({ kind: 'dev' }, () => ({
      description: t('settings.updates.dev.message'),
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
      // Progress is absent until the first event, and its unit differs by platform — bytes here,
      // precache entries on the web — so the row reports a percentage rather than a raw count.
      const percent =
        s.progress && s.progress.total > 0 ? Math.round((s.progress.completed / s.progress.total) * 100) : 0;
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
