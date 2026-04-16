//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { Panel, Toolbar, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { meta } from '#meta';
import { type Discord } from '#types';

export type BotArticleProps = AppSurface.ObjectArticleProps<Discord.Bot>;

const StatusIndicator = ({ status }: { status?: string }) => {
  const colorClass = status === 'connected' ? 'bg-green-500' : status === 'error' ? 'bg-red-500' : 'bg-neutral-500';
  return <span className={mx('inline-block w-2 h-2 rounded-full', colorClass)} />;
};

export const BotArticle = ({ role, subject: bot }: BotArticleProps) => {
  const { t } = useTranslation(meta.id);
  const [tokenVisible, setTokenVisible] = useState(false);

  const handleCopyInviteUrl = useCallback(() => {
    if (bot.inviteUrl) {
      void navigator.clipboard.writeText(bot.inviteUrl);
    }
  }, [bot.inviteUrl]);

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

  const maskedToken = bot.token ? `${'•'.repeat(Math.min(bot.token.length, 20))}` : undefined;

  return (
    <Panel.Root role={role}>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <span className='flex items-center gap-2 text-sm font-medium'>
            <StatusIndicator status={bot.status} />
            {t(`status-${bot.status ?? 'disconnected'}.label`)}
          </span>
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content>
        <div className='flex flex-col gap-4 p-4'>
          {/* Bot Token. */}
          <div className='flex flex-col gap-1'>
            <label className='text-xs text-neutral-500'>{t('bot-token.label')}</label>
            <div className='flex items-center gap-2'>
              <input
                type={tokenVisible ? 'text' : 'password'}
                className='border rounded px-2 py-1 text-sm flex-1 bg-transparent'
                value={bot.token ?? ''}
                onChange={(event) => handleSetToken(event.target.value)}
                placeholder={maskedToken ?? 'Paste bot token'}
              />
              <button
                className='text-xs text-neutral-500 hover:text-neutral-700'
                onClick={() => setTokenVisible((visible) => !visible)}
              >
                {tokenVisible ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {/* Invite URL. */}
          {bot.inviteUrl && (
            <div className='flex flex-col gap-1'>
              <label className='text-xs text-neutral-500'>{t('invite-url.label')}</label>
              <div className='flex items-center gap-2'>
                <span className='text-sm truncate flex-1 text-neutral-600'>{bot.inviteUrl}</span>
                <button className='text-xs px-2 py-1 border rounded hover:bg-neutral-100' onClick={handleCopyInviteUrl}>
                  {t('copy-invite.button')}
                </button>
              </div>
            </div>
          )}

          {/* Guild info. */}
          {bot.guildName && (
            <div className='flex flex-col gap-1'>
              <label className='text-xs text-neutral-500'>{t('guild.label')}</label>
              <span className='text-sm'>{bot.guildName}</span>
            </div>
          )}

          {/* Channels. */}
          {bot.channels && bot.channels.length > 0 ? (
            <div className='flex flex-col gap-1'>
              <label className='text-xs text-neutral-500'>{t('channels.label')}</label>
              <ul className='text-sm'>
                {bot.channels.map((channel) => (
                  <li key={channel.channelId} className='py-0.5'>
                    #{channel.channelName}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            bot.guildName && <span className='text-xs text-neutral-400'>{t('no-channels.label')}</span>
          )}

          {/* Disconnect. */}
          {bot.guildId && (
            <button
              className='self-start text-sm px-3 py-1 border rounded text-red-600 hover:bg-red-50'
              onClick={handleDisconnect}
            >
              {t('disconnect.button')}
            </button>
          )}
        </div>
      </Panel.Content>
    </Panel.Root>
  );
};
