//
// Copyright 2026 DXOS.org
//

import React, { Children, type PropsWithChildren } from 'react';

import { type Database } from '@dxos/echo';
import { Flex, Panel, ScrollArea, Timestamp, type TimestampProps, useTranslation } from '@dxos/react-ui';
import { Listbox } from '@dxos/react-ui-list';
import { ActionToolbar, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';

import { meta } from '#meta';
import { type DiscordBinding, type DiscordOperation } from '#types';

import { DiscordBindingForm } from '../DiscordBindingForm/index.ts';
import { DiscordBotStatus } from '../DiscordBotStatus/index.ts';

//
// Root
//

type AgentActivityRootProps = PropsWithChildren<{
  role?: string;
  /** Scopes the bot toolbar to the host plank's attention; without one the toolbar is always enabled. */
  attendableId?: string;
  /** Whether the agent has a saved Discord binding; the bot cannot start without one. */
  bound?: boolean;
  running?: boolean;
  busy?: boolean;
  onStart?: () => void;
  onStop?: () => void;
  onRefresh?: () => void;
}>;

/** The agent's activity panel: the Discord bot toolbar above a scrolling body. */
const AgentActivityRoot = ({
  role,
  attendableId,
  bound = false,
  running = false,
  busy = false,
  onStart,
  onStop,
  onRefresh,
  children,
}: AgentActivityRootProps) => {
  const menuActions = useMenuBuilder(
    () =>
      MenuBuilder.make()
        .root({ label: ['discord-bot-actions.label', { ns: meta.profile.key }] })
        .action(
          'start',
          {
            // Reconfigures a running bot, so the label follows the state.
            label: [running ? 'discord-bot-restart.label' : 'discord-bot-start.label', { ns: meta.profile.key }],
            icon: running ? 'ph--arrow-clockwise--regular' : 'ph--play--regular',
            disabled: busy || !bound,
          },
          () => onStart?.(),
        )
        .action(
          'stop',
          {
            label: ['discord-bot-stop.label', { ns: meta.profile.key }],
            icon: 'ph--stop--regular',
            disabled: busy || !bound || !running,
          },
          () => onStop?.(),
        )
        .action(
          'refresh',
          {
            label: ['discord-bot-refresh.label', { ns: meta.profile.key }],
            icon: 'ph--arrows-counter-clockwise--regular',
            disabled: busy || !bound,
          },
          () => onRefresh?.(),
        )
        .build(),
    [running, busy, bound, onStart, onStop, onRefresh],
  );

  return (
    <Panel.Root role={role}>
      <Panel.Toolbar asChild>
        <ActionToolbar {...menuActions} attendableId={attendableId} alwaysActive={attendableId === undefined} />
      </Panel.Toolbar>
      <Panel.Content asChild>
        <ScrollArea.Root orientation='vertical'>
          <ScrollArea.Viewport>{children}</ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Content>
    </Panel.Root>
  );
};

AgentActivityRoot.displayName = 'AgentActivity.Root';

//
// Discord
//

type AgentActivityDiscordProps = {
  /** Database the bot-token picker queries. */
  db?: Database.Database;
  values?: Partial<DiscordBinding.Properties>;
  /** Whether the binding exists; an unsaved binding saves on explicit submit and reports no status. */
  bound?: boolean;
  status?: DiscordOperation.BotStatus;
  /** A failure to reach EDGE. */
  error?: string;
  /** Id of the saved binding, to tell this agent's bot from one EDGE runs for another binding. */
  bindingId?: string;
  onSave?: (values: DiscordBinding.Properties) => void;
};

/** The agent's Discord binding and its bot's gateway status. */
const AgentActivityDiscord = ({
  db,
  values,
  bound = false,
  status,
  error,
  bindingId,
  onSave,
}: AgentActivityDiscordProps) => {
  const { t } = useTranslation(meta.profile.key);
  return (
    <Flex asChild column gap='sm'>
      <section aria-label={t('discord-binding.label')}>
        <DiscordBindingForm
          db={db}
          label={t('discord-binding.label')}
          description={t('discord-binding.description')}
          values={values}
          autoSave={bound}
          onSave={onSave}
        >
          {bound && <DiscordBotStatus status={status} error={error} bindingId={bindingId} />}
        </DiscordBindingForm>
      </section>
    </Flex>
  );
};

AgentActivityDiscord.displayName = 'AgentActivity.Discord';

//
// Conversations
//

type AgentActivityConversationsProps = PropsWithChildren;

/** The agent's conversations bridged from Discord threads; children are {@link AgentActivityConversation} rows. */
const AgentActivityConversations = ({ children }: AgentActivityConversationsProps) => {
  const { t } = useTranslation(meta.profile.key);
  return (
    <Flex asChild column>
      <section aria-label={t('conversations.heading')}>
        <h3 className='px-2 text-sm text-description'>{t('conversations.heading')}</h3>
        {Children.count(children) === 0 ? (
          <Flex center classNames='p-2 text-description' role='status'>
            {t('conversations-empty.message')}
          </Flex>
        ) : (
          <Listbox.Root>
            <Listbox.Content>{children}</Listbox.Content>
          </Listbox.Root>
        )}
      </section>
    </Flex>
  );
};

AgentActivityConversations.displayName = 'AgentActivity.Conversations';

//
// Conversation
//

type AgentActivityConversationProps = {
  id: string;
  title?: string;
  /** When the thread last had a message; absent before its first. */
  lastActivity?: TimestampProps['date'];
  /** Fixes the instant timestamps are measured against, so stories and tests do not drift. */
  now?: Date;
  onSelect?: (id: string) => void;
};

/** One Discord thread the agent converses in. */
const AgentActivityConversation = ({ id, title, lastActivity, now, onSelect }: AgentActivityConversationProps) => {
  const { t } = useTranslation(meta.profile.key);
  return (
    <Listbox.Item id={id} onClick={() => onSelect?.(id)}>
      <Listbox.ItemContent
        icon='ph--discord-logo--regular'
        title={title || t('conversation-untitled.label')}
        description={lastActivity !== undefined ? <Timestamp date={lastActivity} now={now} /> : undefined}
      />
    </Listbox.Item>
  );
};

AgentActivityConversation.displayName = 'AgentActivity.Conversation';

//
// AgentActivity
//

export const AgentActivity = {
  Root: AgentActivityRoot,
  Discord: AgentActivityDiscord,
  Conversations: AgentActivityConversations,
  Conversation: AgentActivityConversation,
};

export type {
  AgentActivityConversationProps,
  AgentActivityConversationsProps,
  AgentActivityDiscordProps,
  AgentActivityRootProps,
};
