//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { Button, Panel, ScrollArea, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { meta } from '#meta';

const DXOS_GUILD_ID = '837138313172353095';

type WidgetMember = {
  id: string;
  username: string;
  avatar_url: string;
  status: 'online' | 'idle' | 'dnd';
};

type Widget = {
  name: string;
  instant_invite: string | null;
  presence_count: number;
  members: WidgetMember[];
};

const STATUS_RING: Record<WidgetMember['status'], string> = {
  online: 'bg-emerald-500',
  idle: 'bg-amber-400',
  dnd: 'bg-rose-500',
};

export type DiscordWidgetProps = {
  guildId?: string;
};

export const DiscordWidget = ({ guildId = DXOS_GUILD_ID }: DiscordWidgetProps) => {
  const { t } = useTranslation(meta.id);
  const [widget, setWidget] = useState<Widget | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch(`https://discord.com/api/guilds/${guildId}/widget.json`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          setUnavailable(true);
          return;
        }
        const data: Widget = await response.json();
        setWidget(data);
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }
        setUnavailable(true);
      }
    })();
    return () => controller.abort();
  }, [guildId]);

  return (
    <Panel.Root>
      <Panel.Content asChild>
        <ScrollArea.Root orientation='vertical'>
          <ScrollArea.Viewport classNames='flex flex-col'>
            <header className='flex flex-col gap-1 px-4 py-3 border-b border-subdued-separator'>
              <div className='text-sm font-medium truncate'>{widget?.name ?? t('discord.label')}</div>
              <div className='text-xs text-description'>
                {unavailable
                  ? t('discord-unavailable.message')
                  : widget
                    ? t('members-online.label', { count: widget.presence_count })
                    : t('discord-loading.message')}
              </div>
            </header>
            <ul className='flex flex-col p-1'>
              {widget?.members.map((member) => (
                <li key={member.id} className='flex items-center gap-2 px-2 py-1 rounded'>
                  <div className='relative shrink-0'>
                    <img src={member.avatar_url} alt='' className='w-6 h-6 rounded-full' />
                    <span
                      className={mx(
                        'absolute -bottom-0.5 -end-0.5 size-2 rounded-full ring-2 ring-base-surface',
                        STATUS_RING[member.status] ?? 'bg-neutral-400',
                      )}
                    />
                  </div>
                  <span className='text-sm truncate'>{member.username}</span>
                </li>
              ))}
            </ul>
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Content>
      {widget?.instant_invite && (
        <Panel.Statusbar size='lg'>
          <Button variant='primary' classNames='w-full' asChild>
            <a href={widget.instant_invite} target='_blank' rel='noopener noreferrer'>
              {t('join-discord.button')}
            </a>
          </Button>
        </Panel.Statusbar>
      )}
    </Panel.Root>
  );
};
