//
// Copyright 2026 DXOS.org
//

import { useAtomSet, useAtomValue } from '@effect/atom-react/Hooks';
import React, { useState } from 'react';

import type * as AppUpdate from '@dxos/app-toolkit/AppUpdate';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Layout from '@dxos/react-ui/Layout';
import * as Menu from '@dxos/react-ui/Menu';

import { meta } from '#meta';

export type UpdateMenuItemProps = {
  manager: AppUpdate.Manager;
};

type Pending = null | 'check' | 'install' | 'apply';

const percent = (progress?: AppUpdate.Progress) =>
  progress && progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;

/**
 * Help-menu entry driven by the platform's update manager: check, then download where that is a separate step,
 * then restart once the update is staged.
 */
export const UpdateMenuItem = ({ manager }: UpdateMenuItemProps) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const status = useAtomValue(manager.status);
  const setStatus = useAtomSet(manager.status);

  // A check can resolve faster than a repaint, so the click's own lifetime also marks the item busy.
  const [pending, setPending] = useState<Pending>(null);
  const run = (kind: Exclude<Pending, null>, action: (() => Promise<void>) | undefined) => async () => {
    if (!action) {
      return;
    }
    setPending(kind);
    try {
      await action();
    } catch (error) {
      setStatus({ kind: 'failed', error: error instanceof Error ? error.message : String(error) });
    } finally {
      setPending(null);
    }
  };

  // Nothing to offer on a dev server or a platform without an update channel.
  if (status.kind === 'unsupported' || status.kind === 'dev') {
    return null;
  }

  const busy = pending !== null || status.kind === 'checking' || status.kind === 'downloading';

  const { value, label, icon, onClick, caption } = (() => {
    switch (status.kind) {
      case 'available':
        return {
          value: 'update-download.label',
          label: t('update-download.label'),
          icon: 'ph--download-simple--regular',
          onClick: run('install', manager.install),
          caption: t('update-available.message', { version: status.version }),
        };
      case 'downloading':
        return {
          value: 'update-downloading.label',
          label: t('update-downloading.label', { percent: percent(status.progress) }),
          icon: 'ph--download-simple--regular',
        };
      case 'ready':
        return {
          value: 'update-apply.label',
          label: t('update-restart.label'),
          icon: 'ph--arrow-clockwise--regular',
          onClick: run('apply', manager.apply),
        };
      default: {
        const checking = pending === 'check' || status.kind === 'checking';
        return {
          value: 'update-check.label',
          label: t(checking ? 'update-checking.label' : 'update-check.label'),
          icon: 'ph--arrows-clockwise--regular',
          onClick: run('check', manager.check),
          caption: checking
            ? undefined
            : status.kind === 'up-to-date'
              ? t('update-up-to-date.message')
              : status.kind === 'failed'
                ? t('update-failed.message')
                : undefined,
        };
      }
    }
  })();

  return (
    <>
      <Menu.Item
        item={{ value, label, icon }}
        disabled={busy}
        // Stays open so the result of a check or download is visible where it was asked for.
        closeOnSelect={status.kind === 'ready'}
        onClick={onClick ? () => void onClick() : undefined}
      />
      {caption && <Layout.Flex classNames='ps-8 pe-2 pb-2 text-xs text-fg-muted'>{caption}</Layout.Flex>}
    </>
  );
};

UpdateMenuItem.displayName = 'UpdateMenuItem';
