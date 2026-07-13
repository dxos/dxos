//
// Copyright 2026 DXOS.org
//

import { formatDistance, isValid } from 'date-fns';
import React, { useCallback } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { StatusBar } from '@dxos/plugin-status-bar/components';
import { useConfig } from '@dxos/react-client';
import { DropdownMenu, Icon, IconButton, useTranslation } from '@dxos/react-ui';
import { isTauri } from '@dxos/util';

import { meta } from '#meta';

import { SHORTCUTS_DIALOG } from '../../constants';

// Mirrors the welcome plugin's ABOUT_DIALOG constant (composer-app/src/plugins/welcome);
// inlined because composer-app is not a workspace dependency.
const ABOUT_DIALOG = 'org.dxos.plugin.welcome.component.about-dialog';

const DOCS_URL = 'https://docs.dxos.org/composer/introduction/';
const DISCORD_URL = 'https://dxos.org/discord';
const GITHUB_URL = 'https://github.com/dxos/dxos';
const DOWNLOAD_URL = 'https://web.crabnebula.cloud/dxos/composer/releases';

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

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <StatusBar.Item>
          <IconButton variant='ghost' icon='ph--info--regular' iconOnly label={t('help-menu.label')} />
        </StatusBar.Item>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content side='left' align='end'>
          <DropdownMenu.Viewport>
            <DropdownMenu.Item asChild>
              <a href={DOCS_URL} target='_blank' rel='noopener noreferrer'>
                <Icon icon='ph--book-open--regular' size={4} />
                <span>{t('docs.label')}</span>
              </a>
            </DropdownMenu.Item>
            <DropdownMenu.Item onClick={openDialog(SHORTCUTS_DIALOG)}>
              <Icon icon='ph--keyboard--regular' size={4} />
              <span>{t('shortcuts.label')}</span>
            </DropdownMenu.Item>
            <DropdownMenu.Separator />
            <DropdownMenu.Item asChild>
              <a href={DISCORD_URL} target='_blank' rel='noopener noreferrer'>
                <Icon icon='ph--discord-logo--regular' size={4} />
                <span>{t('discord.label')}</span>
              </a>
            </DropdownMenu.Item>
            <DropdownMenu.Item asChild>
              <a href={GITHUB_URL} target='_blank' rel='noopener noreferrer'>
                <Icon icon='ph--github-logo--regular' size={4} />
                <span>{t('github.label')}</span>
              </a>
            </DropdownMenu.Item>
            {!isTauri() && (
              <DropdownMenu.Item asChild>
                <a href={DOWNLOAD_URL} target='_blank' rel='noopener noreferrer'>
                  <Icon icon='ph--download-simple--regular' size={4} />
                  <span>{t('download-apps.label')}</span>
                </a>
              </DropdownMenu.Item>
            )}
            <DropdownMenu.Separator />
            <DropdownMenu.Item onClick={openDialog(ABOUT_DIALOG)}>
              <Icon icon='ph--info--regular' size={4} />
              <span>{t('about.label')}</span>
            </DropdownMenu.Item>
            {version && (
              <div className='ps-8 pe-2 pb-2 flex flex-col text-xs text-description'>
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
              </div>
            )}
          </DropdownMenu.Viewport>
          <DropdownMenu.Arrow />
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};

HelpMenu.displayName = 'HelpMenu';
