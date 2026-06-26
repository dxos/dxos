//
// Copyright 2026 DXOS.org
//

// TODO(wittjosiah): Remove?

import React, { type ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react';

import { DXOSHorizontalType } from '@dxos/brand';
import { IconButton, ScrollArea, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { meta } from '#meta';

import { DEFAULT_TEAM, DXOS_GUILD_ID } from '../../constants';

export type DiscordChannel = {
  name: string;
  id: string;
};

const WELCOME_CHANNEL_ID = '837139872460046376';

const DEFAULT_CHANNELS: ReadonlyArray<DiscordChannel> = [
  {
    name: 'announcements',
    id: '837383109527470140',
  },
  {
    name: 'general',
    id: '837138313172353098',
  },
  {
    name: 'work-in-progress',
    id: '1275086707342970922',
  },
  {
    name: 'help',
    id: '1080292583588237342',
  },
];

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
  guildId: string;
  team: ReadonlySet<string>;
  channels: ReadonlyArray<DiscordChannel>;
};

const WidgetContext = createContext<WidgetContextValue | null>(null);

const useWidgetContext = () => {
  const ctx = useContext(WidgetContext);
  if (!ctx) {
    throw new Error('DiscordComponent.* parts must be rendered inside DiscordComponent.Root.');
  }
  return ctx;
};

export type DiscordComponentRootProps = {
  guildId?: string;
  /** Usernames that should sort to the top of the member list. */
  teamMembers?: Iterable<string>;
  /** Channels rendered by `DiscordComponent.Channels`. */
  channels?: ReadonlyArray<DiscordChannel>;
  children?: ReactNode;
};

const Root = ({ guildId = DXOS_GUILD_ID, teamMembers, channels, children }: DiscordComponentRootProps) => {
  const [data, setData] = useState<WidgetData | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const team = useMemo(() => (teamMembers ? new Set(teamMembers) : DEFAULT_TEAM), [teamMembers]);
  const resolvedChannels = useMemo(() => channels ?? DEFAULT_CHANNELS, [channels]);

  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setUnavailable(false);
    void (async () => {
      try {
        // Discord's CDN caches the widget response without `Vary: Origin`, so a single
        // ACAO value gets served to every caller for ~5 minutes. Pin the cache key to
        // the current origin so each origin gets its own (correct) cached response.
        const url = new URL(`https://discord.com/api/guilds/${guildId}/widget.json`);
        url.searchParams.set('_origin', window.location.origin);
        const response = await fetch(url.toString(), { signal: controller.signal });
        if (!response.ok) {
          setData(null);
          setUnavailable(true);
          return;
        }
        setData(await response.json());
        setUnavailable(false);
      } catch {
        if (controller.signal.aborted) {
          return;
        }
        setData(null);
        setUnavailable(true);
      }
    })();
    return () => controller.abort();
  }, [guildId]);

  return (
    <WidgetContext.Provider value={{ data, unavailable, guildId, team, channels: resolvedChannels }}>
      {children}
    </WidgetContext.Provider>
  );
};

const Header = () => {
  const { t } = useTranslation(meta.profile.key);
  const { data, unavailable, guildId } = useWidgetContext();

  return (
    <header className='flex items-center justify-between gap-1 px-2 bg-modal-surface'>
      <a
        href={`https://discord.com/channels/${guildId}/${WELCOME_CHANNEL_ID}`}
        target='_blank'
        rel='noopener noreferrer'
      >
        <DXOSHorizontalType className='h-10 w-auto fill-current' />
      </a>

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

const Channels = () => {
  const { guildId, channels } = useWidgetContext();
  if (channels.length === 0) {
    return null;
  }

  return (
    <nav className='border-b border-subdued-separator'>
      <ul className='flex flex-col p-1'>
        {channels.map((channel) => (
          <li key={channel.id}>
            <a
              href={`https://discord.com/channels/${guildId}/${channel.id}`}
              target='_blank'
              rel='noopener noreferrer'
              className='flex items-center gap-1 px-2 py-1 rounded-sm text-sm hover:bg-hover-surface'
            >
              <span className='text-description'>#</span>
              <span className='truncate'>{channel.name}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
};

const STATUS_RING: Record<WidgetMember['status'], string> = {
  online: 'bg-emerald-500',
  idle: 'bg-amber-400',
  dnd: 'bg-rose-500',
};

const MemberRow = ({ member }: { member: WidgetMember }) => (
  <li className='flex items-center gap-2 px-2 py-1 rounded'>
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
);

const partitionMembers = (
  members: WidgetMember[],
  team: ReadonlySet<string>,
): { teamMembers: WidgetMember[]; otherMembers: WidgetMember[] } => {
  const collator = new Intl.Collator(undefined, { sensitivity: 'base' });
  const sorted = [...members].sort((left, right) => collator.compare(left.username, right.username));
  const teamMembers: WidgetMember[] = [];
  const otherMembers: WidgetMember[] = [];
  for (const member of sorted) {
    (team.has(member.username) ? teamMembers : otherMembers).push(member);
  }
  return { teamMembers, otherMembers };
};

const Content = () => {
  const { data, team } = useWidgetContext();
  const { teamMembers, otherMembers } = useMemo(
    () => (data ? partitionMembers(data.members, team) : { teamMembers: [], otherMembers: [] }),
    [data, team],
  );
  const hasSeparator = teamMembers.length > 0 && otherMembers.length > 0;
  return (
    <ScrollArea.Root orientation='vertical'>
      <ScrollArea.Viewport>
        <ul className='flex flex-col p-1'>
          {teamMembers.map((member) => (
            <MemberRow key={`${member.id}-${member.username}`} member={member} />
          ))}
          {hasSeparator && (
            <li role='separator' aria-hidden='true' className='my-1 border-t border-subdued-separator' />
          )}
          {otherMembers.map((member) => (
            <MemberRow key={`${member.id}-${member.username}`} member={member} />
          ))}
        </ul>
      </ScrollArea.Viewport>
    </ScrollArea.Root>
  );
};

const StatusBar = () => {
  const { t } = useTranslation(meta.profile.key);
  const { data } = useWidgetContext();
  if (!data?.instant_invite) {
    return null;
  }

  return (
    <IconButton
      icon='ph--discord-logo--regular'
      label={t('join-discord.button')}
      variant='primary'
      classNames='w-full'
      onClick={() => {
        window.open(data.instant_invite!, '_blank', 'noopener,noreferrer');
      }}
    />
  );
};

export const DiscordComponent = {
  Root,
  Header,
  Channels,
  Content,
  StatusBar,
};
