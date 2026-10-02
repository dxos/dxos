//
// Copyright 2026 DXOS.org
//

import { formatDistance, isValid } from 'date-fns';
import React, { useCallback } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/Hooks';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { getEnvString } from '@dxos/config';
import { StatusBar } from '@dxos/plugin-status-bar/StatusBar';
import { useConfig } from '@dxos/react-client';
import * as Flex from '@dxos/react-ui/Flex';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as IconButton from '@dxos/react-ui/IconButton';
import * as Menu from '@dxos/react-ui/Menu';
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
  const { t } = Hooks.useTranslation(meta.profile.key);
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
    <Menu.Root>
      <Menu.Trigger asChild>
        <StatusBar.Item>
          <IconButton.Root variant='ghost' icon='ph--info--regular' iconOnly label={t('help-menu.label')} />
        </StatusBar.Item>
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content side='left' align='end'>
          <Menu.Viewport>
            <Menu.Item asChild>
              <a href={DOCS_URL} target='_blank' rel='noopener noreferrer'>
                <Icon.Root icon='ph--book-open--regular' size={4} />
                <span>{t('docs.label')}</span>
              </a>
            </Menu.Item>
            <Menu.Item onClick={openDialog(SHORTCUTS_DIALOG)}>
              <Icon.Root icon='ph--keyboard--regular' size={4} />
              <span>{t('shortcuts.label')}</span>
            </Menu.Item>
            <Menu.Separator />
            <Menu.Item asChild>
              <a href={DISCORD_URL} target='_blank' rel='noopener noreferrer'>
                <Icon.Root icon='ph--discord-logo--regular' size={4} />
                <span>{t('discord.label')}</span>
              </a>
            </Menu.Item>
            <Menu.Item asChild>
              <a href={GITHUB_URL} target='_blank' rel='noopener noreferrer'>
                <Icon.Root icon='ph--github-logo--regular' size={4} />
                <span>{t('github.label')}</span>
              </a>
            </Menu.Item>
            {!isTauri() && (
              <Menu.Item asChild>
                <a href={downloadHref} target='_blank' rel='noopener noreferrer'>
                  <Icon.Root icon='ph--download-simple--regular' size={4} />
                  <span>{t('download-apps.label')}</span>
                </a>
              </Menu.Item>
            )}
            <Menu.Separator />
            <Menu.Item onClick={openDialog(ABOUT_DIALOG)}>
              <Icon.Root icon='ph--info--regular' size={4} />
              <span>{t('about.label')}</span>
            </Menu.Item>
            {version && (
              <Flex.Root column classNames='ps-8 pe-2 pb-2 text-xs text-description'>
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
              </Flex.Root>
            )}
          </Menu.Viewport>
          <Menu.Arrow />
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
};

HelpMenu.displayName = 'HelpMenu';
