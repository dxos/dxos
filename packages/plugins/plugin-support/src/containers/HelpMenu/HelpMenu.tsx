//
// Copyright 2026 DXOS.org
//

import { formatDistance, isValid } from 'date-fns';
import React, { useCallback } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { getEnvString } from '@dxos/config';
import { StatusBar } from '@dxos/plugin-status-bar/components';
import { useConfig } from '@dxos/react-client';
import { Flex, useTranslation } from '@dxos/react-ui';
import { Next } from '@dxos/react-ui/next';
import { isTauri } from '@dxos/util';

import { meta } from '#meta';

import { SHORTCUTS_DIALOG } from '../../constants.ts';
import { downloadUrl } from './download.ts';

// Mirrors the welcome plugin's ABOUT_DIALOG constant (composer-app/src/plugins/welcome);
// inlined because composer-app is not a workspace dependency.
const ABOUT_DIALOG = 'org.dxos.plugin.welcome.component.about-dialog';

const DOCS_URL = 'https://docs.dxos.org/composer/introduction/';
const DISCORD_URL = 'https://dxos.org/discord';
const GITHUB_URL = 'https://github.com/dxos/dxos';

export const HelpMenu = () => {
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = useOperationInvoker();
  const config = useConfig();
  const { version, timestamp, commitHash } = config.values.runtime?.app?.build ?? {};
  const releasedAt = timestamp ? new Date(timestamp) : undefined;
  const released = releasedAt && isValid(releasedAt) ? releasedAt : undefined;
  const releaseUrl =
    config.values.runtime?.app?.env?.DX_ENVIRONMENT === 'production'
      ? `${GITHUB_URL}/releases/tag/v${version}` // e.g. v0.8.3-beta.b78990fdd5
      : `${GITHUB_URL}/commit/${commitHash}`;

  const openDialog = useCallback(
    (subject: string) => () => {
      void invokePromise(LayoutOperation.UpdateDialog, { subject });
    },
    [invokePromise],
  );

  // The dashboard on production, the channel's own latest installer elsewhere.
  const downloadHref = downloadUrl(getEnvString(config, 'DX_ENVIRONMENT'));

  return (
    <Next.Menu.Root positioning={{ placement: 'left-end' }}>
      <Next.Menu.Trigger asChild>
        <StatusBar.Item>
          <Next.Button variant='ghost' icon='ph--info--regular' iconOnly label={t('help-menu.label')} />
        </StatusBar.Item>
      </Next.Menu.Trigger>
      <Next.Menu.Content>
        <Next.Menu.Item asChild>
          <a href={DOCS_URL} target='_blank' rel='noopener noreferrer'>
            <Next.Icon icon='ph--book-open--regular' size='md' />
            <span>{t('docs.label')}</span>
          </a>
        </Next.Menu.Item>
        <Next.Menu.Item onClick={openDialog(SHORTCUTS_DIALOG)}>
          <Next.Icon icon='ph--keyboard--regular' size='md' />
          <span>{t('shortcuts.label')}</span>
        </Next.Menu.Item>
        <Next.Menu.Separator />
        <Next.Menu.Item asChild>
          <a href={DISCORD_URL} target='_blank' rel='noopener noreferrer'>
            <Next.Icon icon='ph--discord-logo--regular' size='md' />
            <span>{t('discord.label')}</span>
          </a>
        </Next.Menu.Item>
        <Next.Menu.Item asChild>
          <a href={GITHUB_URL} target='_blank' rel='noopener noreferrer'>
            <Next.Icon icon='ph--github-logo--regular' size='md' />
            <span>{t('github.label')}</span>
          </a>
        </Next.Menu.Item>
        {!isTauri() && (
          <Next.Menu.Item asChild>
            <a href={downloadHref} target='_blank' rel='noopener noreferrer'>
              <Next.Icon icon='ph--download-simple--regular' size='md' />
              <span>{t('download-apps.label')}</span>
            </a>
          </Next.Menu.Item>
        )}
        <Next.Menu.Separator />
        <Next.Menu.Item onClick={openDialog(ABOUT_DIALOG)}>
          <Next.Icon icon='ph--info--regular' size='md' />
          <span>{t('about.label')}</span>
        </Next.Menu.Item>
        {version && (
          <Flex column classNames='ps-8 pe-2 pb-2 text-xs text-description'>
            <a href={releaseUrl} target='_blank' rel='noopener noreferrer' className='dx-link-hover font-mono'>
              {version}
            </a>
            {released && (
              <span>
                {t('released.message', {
                  released: formatDistance(released, new Date(), { addSuffix: true }),
                })}
              </span>
            )}
          </Flex>
        )}
      </Next.Menu.Content>
    </Next.Menu.Root>
  );
};

HelpMenu.displayName = 'HelpMenu';
