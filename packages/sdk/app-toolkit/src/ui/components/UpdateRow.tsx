//
// Copyright 2026 DXOS.org
//

import { useAtomSet, useAtomValue } from '@effect/atom-react/Hooks';
import * as Match from 'effect/Match';
import React, { type ReactNode, useState } from 'react';

import { Button } from '@dxos/react-ui';

// eslint-disable-next-line @dxos/rules/import-as-namespace
import type * as AppUpdate from '../../app/AppUpdate.ts';

export type UpdateRowProps = {
  manager: AppUpdate.Manager;
  /**
   * Translator for the caller's own namespace. Passed in rather than resolved here so each plugin
   * keeps ownership of its strings; both platforms use the same `settings.updates.*` key names.
   */
  t: (key: string, options?: Record<string, unknown>) => string;
};

export type UpdateRowContent = {
  description: string;
  button: ReactNode;
};

/**
 * "5 minutes ago" without pulling `date-fns` into app-toolkit, which nearly every package depends on.
 * `Intl.RelativeTimeFormat` is built in and good enough for a single settings line.
 */
const relativeTime = (timestamp: number): string => {
  const seconds = Math.round((timestamp - Date.now()) / 1000);
  const format = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  const [unit, perUnit] =
    Math.abs(seconds) < 60
      ? (['second', 1] as const)
      : Math.abs(seconds) < 3600
        ? (['minute', 60] as const)
        : Math.abs(seconds) < 86_400
          ? (['hour', 3600] as const)
          : (['day', 86_400] as const);
  // Truncated so 59m30s reads "59 minutes ago", not "60 minutes ago".
  return format.format(Math.trunc(seconds / perUnit), unit);
};

/** Which action the user last triggered, so the button can show a busy state the status alone cannot. */
type Pending = null | 'check' | 'install' | 'apply';

/**
 * The update control, driven entirely by {@link AppUpdate.Status}.
 *
 * Shared because the two platforms differ in what they can do, not in how the result should read: a
 * user should not have to learn a second vocabulary for updates because they opened the web app
 * instead of the desktop one. Returns content rather than a laid-out row, so each plugin can drop it
 * into its own settings form.
 */
export const useUpdateRow = ({ manager, t }: UpdateRowProps): UpdateRowContent => {
  const status = useAtomValue(manager.status);
  const setStatus = useAtomSet(manager.status);

  // The status atom can flip between `checking` and `up-to-date` faster than the user can perceive,
  // so the button is also gated on the click handler's lifetime — otherwise a check that resolves
  // instantly looks like nothing happened.
  const [pending, setPending] = useState<Pending>(null);
  const runAction = (kind: Exclude<Pending, null>, action: (() => Promise<void>) | undefined) => async () => {
    if (!action) {
      return;
    }
    setPending(kind);
    try {
      await action();
    } catch (error) {
      // Otherwise a rejected install or apply leaves the row unchanged, with no sign it failed.
      setStatus({ kind: 'failed', error: error instanceof Error ? error.message : String(error) });
    } finally {
      setPending(null);
    }
  };

  const onCheck = runAction('check', manager.check);
  const onInstall = runAction('install', manager.install);
  const onApply = runAction('apply', manager.apply);

  const isChecking = pending === 'check' || status.kind === 'checking';
  const isInstalling = pending === 'install' || status.kind === 'downloading';

  const checkButton = (disabled = false) => (
    <Button disabled={disabled || isChecking || isInstalling || pending === 'apply'} onClick={() => void onCheck()}>
      {isChecking ? t('settings.updates.checking.label') : t('settings.updates.check.label')}
    </Button>
  );

  return Match.value(status).pipe(
    Match.withReturnType<UpdateRowContent>(),
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
            checkedAt: relativeTime(s.checkedAt),
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
    Match.when({ kind: 'downloading' }, (s) => ({
      // Progress is absent until the first event, and its unit differs by platform — bytes for a
      // native archive, precache entries on the web — so this reports a percentage either way.
      description: t('settings.updates.downloading.message', {
        percent: s.progress && s.progress.total > 0 ? Math.round((s.progress.completed / s.progress.total) * 100) : 0,
      }),
      button: <Button disabled>{t('settings.updates.downloading.label')}</Button>,
    })),
    Match.when({ kind: 'ready' }, () => ({
      description: t('settings.updates.ready.message'),
      button: (
        <Button variant='primary' disabled={pending === 'apply'} onClick={() => void onApply()}>
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
