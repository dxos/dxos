//
// Copyright 2026 DXOS.org
//

import { formatDistance, isValid } from 'date-fns';
import React, { type MouseEvent, useCallback } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { log } from '@dxos/log';
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

// CrabNebula's dashboard only lists the primary channel, so a prerelease build cannot link there for its
// own installer. Its update endpoint is public and channel-addressable, and the JSON it returns names the
// platform asset — enough to send someone straight at the binary without a release page existing.
const UPDATE_ENDPOINT = 'https://cdn.crabnebula.app/update/dxos/composer';

// TODO(wittjosiah): Only macOS is built today; derive this once Windows and Linux ship (`windows-x86_64`,
// `linux-x86_64`, `darwin-x86_64`).
const UPDATE_PLATFORM = 'darwin-aarch64';

/**
 * Resolve a channel's current download URL.
 * `0.0.0` as the current version so every build reads as an upgrade and the asset is always returned —
 * this only reads the metadata, it never installs.
 */
const resolveDownloadUrl = async (channel: string): Promise<string> => {
  const response = await fetch(`${UPDATE_ENDPOINT}/${UPDATE_PLATFORM}/0.0.0?channel=${channel}`);
  if (!response.ok) {
    throw new Error(`update endpoint returned ${response.status}`);
  }
  const { url } = (await response.json()) as { url?: string };
  if (!url) {
    throw new Error('update endpoint returned no asset url');
  }
  return url;
};

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

  // Production ships on CrabNebula's `main` channel and is the only one its dashboard lists; every other
  // environment resolves its own asset below. Undefined on production so the anchor's href just works.
  const environment = config.values.runtime?.app?.env?.DX_ENVIRONMENT;
  const prereleaseChannel = environment && environment !== 'production' ? environment : undefined;

  const handleDownload = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      if (!prereleaseChannel) {
        return;
      }
      event.preventDefault();
      void resolveDownloadUrl(prereleaseChannel)
        .then((url) => window.open(url, '_blank', 'noopener,noreferrer'))
        .catch((err) => {
          // The dashboard has no page for this channel, but it is a better answer than a dead click.
          log.catch(err);
          window.open(DOWNLOAD_URL, '_blank', 'noopener,noreferrer');
        });
    },
    [prereleaseChannel],
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
                <a href={DOWNLOAD_URL} target='_blank' rel='noopener noreferrer' onClick={handleDownload}>
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
