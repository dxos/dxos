//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { Button, Clipboard, Input, Panel, ScrollArea, Toolbar, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';
import { type Discord } from '#types';

export type BotArticleProps = AppSurface.ObjectArticleProps<Discord.Bot>;

export const BotArticle = ({ role, subject: bot }: BotArticleProps) => {
  const { t } = useTranslation(meta.id);
  const [tokenVisible, setTokenVisible] = useState(false);

  const handleSetToken = useCallback(
    (value: string) => {
      Obj.change(bot, (bot) => {
        bot.token = value;
      });
    },
    [bot],
  );

  const handleDisconnect = useCallback(() => {
    Obj.change(bot, (bot) => {
      bot.guildId = undefined;
      bot.guildName = undefined;
      bot.channels = [];
      bot.status = 'disconnected';
    });
  }, [bot]);

  return (
    <Panel.Root role={role}>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <span>{t(`status-${bot.status ?? 'disconnected'}.label`)}</span>
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content asChild>
        <ScrollArea.Root orientation='vertical'>
          <ScrollArea.Viewport classNames='p-4 space-y-4'>
            <Input.Root>
              <Input.Label>{t('bot-token.label')}</Input.Label>
              <div role='none' className='flex items-center gap-2'>
                <Input.TextInput
                  type={tokenVisible ? 'text' : 'password'}
                  value={bot.token ?? ''}
                  onChange={(event) => handleSetToken(event.target.value)}
                />
                <Button variant='ghost' onClick={() => setTokenVisible((visible) => !visible)}>
                  {tokenVisible ? 'Hide' : 'Show'}
                </Button>
              </div>
            </Input.Root>

            {bot.inviteUrl && (
              <Input.Root>
                <Input.Label>{t('invite-url.label')}</Input.Label>
                <div role='none' className='flex items-center gap-2'>
                  <Input.TextInput disabled value={bot.inviteUrl} />
                  <Clipboard.IconButton value={bot.inviteUrl} />
                </div>
              </Input.Root>
            )}

            {bot.guildName && (
              <Input.Root>
                <Input.Label>{t('guild.label')}</Input.Label>
                <Input.TextInput disabled value={bot.guildName} />
              </Input.Root>
            )}

            {bot.channels && bot.channels.length > 0 && (
              <Input.Root>
                <Input.Label>{t('channels.label')}</Input.Label>
                {bot.channels.map((channel) => (
                  <Input.TextInput key={channel.channelId} disabled value={`#${channel.channelName}`} />
                ))}
              </Input.Root>
            )}

            {bot.guildId && (
              <Button variant='outline' onClick={handleDisconnect}>
                {t('disconnect.button')}
              </Button>
            )}
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Content>
    </Panel.Root>
  );
};
