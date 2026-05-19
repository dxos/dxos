//
// Copyright 2026 DXOS.org
//

import React, { type ReactNode, createContext, useContext, useEffect, useState } from 'react';

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

type WidgetData = {
  name: string;
  instant_invite: string | null;
  presence_count: number;
  members: WidgetMember[];
};

type WidgetContextValue = {
  data: WidgetData | null;
  unavailable: boolean;
};

const WidgetContext = createContext<WidgetContextValue | null>(null);

const useWidgetContext = () => {
  const ctx = useContext(WidgetContext);
  if (!ctx) {
    throw new Error('DiscordWidget.* parts must be rendered inside DiscordWidget.Root.');
  }
  return ctx;
};

export type DiscordWidgetRootProps = {
  guildId?: string;
  children?: ReactNode;
};

const Root = ({ guildId = DXOS_GUILD_ID, children }: DiscordWidgetRootProps) => {
  const [data, setData] = useState<WidgetData | null>(null);
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
        setData(await response.json());
      } catch {
        if (controller.signal.aborted) {
          return;
        }
        setUnavailable(true);
      }
    })();
    return () => controller.abort();
  }, [guildId]);

  return (
    <WidgetContext.Provider value={{ data, unavailable }}>
      <Panel.Root>{children}</Panel.Root>
    </WidgetContext.Provider>
  );
};

const Header = () => {
  const { t } = useTranslation(meta.id);
  const { data, unavailable } = useWidgetContext();
  return (
    <header
      data-slot='toolbar'
      style={{ gridArea: 'toolbar' }}
      className='shrink-0 flex flex-col gap-0.5 px-4 py-3 bg-modal-surface border-b border-subdued-separator'
    >
      <div className='text-sm font-medium truncate'>{data?.name ?? t('discord.label')}</div>
      <div className='text-xs text-description'>
        {unavailable
          ? t('discord-unavailable.message')
          : data
            ? t('members-online.label', { count: data.presence_count })
            : t('discord-loading.message')}
      </div>
    </header>
  );
};

const STATUS_RING: Record<WidgetMember['status'], string> = {
  online: 'bg-emerald-500',
  idle: 'bg-amber-400',
  dnd: 'bg-rose-500',
};

const Members = () => {
  const { data } = useWidgetContext();
  return (
    <Panel.Content asChild>
      <ScrollArea.Root orientation='vertical'>
        <ScrollArea.Viewport>
          <ul className='flex flex-col p-1'>
            {data?.members.map((member) => (
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
  );
};

const Join = () => {
  const { t } = useTranslation(meta.id);
  const { data } = useWidgetContext();
  if (!data?.instant_invite) {
    return null;
  }
  return (
    <Panel.Statusbar size='lg'>
      <Button variant='primary' classNames='w-full' asChild>
        <a href={data.instant_invite} target='_blank' rel='noopener noreferrer'>
          {t('join-discord.button')}
        </a>
      </Button>
    </Panel.Statusbar>
  );
};

export const DiscordWidget = {
  Root,
  Header,
  Members,
  Join,
};
