//
// Copyright 2026 DXOS.org
//

import { formatDistance, isValid } from 'date-fns';
import React, { useCallback } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { getEnvString } from '@dxos/config';
import * as StatusBar from '@dxos/plugin-status-bar/StatusBar';
import { useConfig } from '@dxos/react-client';
import { Button, Flex, Menu, useTranslation } from '@dxos/react-ui';
import { isTauri } from '@dxos/util';

import { meta } from '#meta';

import { ABOUT_DIALOG, SHORTCUTS_DIALOG } from '../../constants.ts';
import { downloadUrl } from './download.ts';

const DOCS_URL = 'https://docs.dxos.org/composer/introduction/';
const DISCORD_URL = 'https://dxos.org/discord';
const GITHUB_URL = 'https://github.com/dxos/dxos';

export const HelpMenu = () => {
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = Hooks.useOperationInvoker();
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
    <Menu.Root positioning={{ placement: 'left-end' }}>
      <Menu.Trigger asChild>
        <StatusBar.Item>
          <Button variant='ghost' icon='ph--info--regular' iconOnly label={t('help-menu.label')} />
        </StatusBar.Item>
      </Menu.Trigger>
      <Menu.Content>
        <Menu.Item asChild item={{ value: 'docs.label', label: t('docs.label'), icon: 'ph--book-open--regular' }}>
          <a href={DOCS_URL} target='_blank' rel='noopener noreferrer'>
            <Menu.ItemIcon />
            <Menu.ItemText />
          </a>
        </Menu.Item>
        <Menu.Item
          item={{ value: 'shortcuts.label', label: t('shortcuts.label'), icon: 'ph--keyboard--regular' }}
          onClick={openDialog(SHORTCUTS_DIALOG)}
        />
        <Menu.Separator />
        <Menu.Item
          asChild
          item={{ value: 'discord.label', label: t('discord.label'), icon: 'ph--discord-logo--regular' }}
        >
          <a href={DISCORD_URL} target='_blank' rel='noopener noreferrer'>
            <Menu.ItemIcon />
            <Menu.ItemText />
          </a>
        </Menu.Item>
        <Menu.Item asChild item={{ value: 'github.label', label: t('github.label'), icon: 'ph--github-logo--regular' }}>
          <a href={GITHUB_URL} target='_blank' rel='noopener noreferrer'>
            <Menu.ItemIcon />
            <Menu.ItemText />
          </a>
        </Menu.Item>
        {!isTauri() && (
          <Menu.Item
            asChild
            item={{
              value: 'download-apps.label',
              label: t('download-apps.label'),
              icon: 'ph--download-simple--regular',
            }}
          >
            <a href={downloadHref} target='_blank' rel='noopener noreferrer'>
              <Menu.ItemIcon />
              <Menu.ItemText />
            </a>
          </Menu.Item>
        )}
        <Menu.Separator />
        <Menu.Item
          item={{ value: 'about.label', label: t('about.label'), icon: 'ph--info--regular' }}
          onClick={openDialog(ABOUT_DIALOG)}
        />
        {version && (
          <Flex column classNames='ps-8 pe-2 pb-2 text-xs text-fg-muted'>
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
      </Menu.Content>
    </Menu.Root>
  );
};

HelpMenu.displayName = 'HelpMenu';
