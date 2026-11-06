//
// Copyright 2026 DXOS.org
//

import React, { type MouseEvent, type PropsWithChildren, type ReactNode } from 'react';

import { Form } from '@dxos/react-ui-form';
import { Listbox } from '@dxos/react-ui-list';
import { ActionToolbar, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import * as Banner from '@dxos/react-ui/Banner';
import * as Button from '@dxos/react-ui/Button';
import * as Fieldset from '@dxos/react-ui/Fieldset';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Layout from '@dxos/react-ui/Layout';
import * as Panel from '@dxos/react-ui/Panel';
import * as Typography from '@dxos/react-ui/Typography';

import { AgentNamespace } from '../../namespace.ts';

//
// Root
//

type AgentActivityRootProps = PropsWithChildren<{
  role?: string;
  toolbar?: ReactNode;
  /** Why the last action failed. */
  error?: string;
}>;

/** The agent's activity panel: who it is, its skills, channels and conversations in one scrolling body. */
const AgentActivityRoot = ({ role, toolbar, error, children }: AgentActivityRootProps) => {
  const { t } = Hooks.useTranslation(AgentNamespace.key);
  return (
    <Panel.Root role={role}>
      {toolbar && <Panel.Header>{toolbar}</Panel.Header>}
      {/* The form's frame and field spacing, so the sections read as the Agent form beside them does. */}
      <Panel.Body asChild>
        <Form.Viewport scroll>
          <Layout.Container gutter='inherit' gap='sm'>
            {error && (
              <Banner.Root valence='error'>
                <Banner.Title>{t('activity-error.label')}</Banner.Title>
                <Banner.Body>{error}</Banner.Body>
              </Banner.Root>
            )}
            {children}
          </Layout.Container>
        </Form.Viewport>
      </Panel.Body>
    </Panel.Root>
  );
};

AgentActivityRoot.displayName = 'AgentActivity.Root';

//
// Toolbar
//

type AgentActivityToolbarProps = {
  attendableId?: string;
  /** Whether any of the agent's channels is connected. */
  running?: boolean;
  /** Whether the agent has channels to connect. */
  connectable?: boolean;
  busy?: boolean;
  onStart?: () => void;
  onStop?: () => void;
  onRefresh?: () => void;
};

/** Re-reads the panel, and connects the agent's channels or, once they run, disconnects them. */
const AgentActivityToolbar = ({
  attendableId,
  running = false,
  connectable = false,
  busy = false,
  onStart,
  onStop,
  onRefresh,
}: AgentActivityToolbarProps) => {
  const menuActions = useMenuBuilder(
    () =>
      MenuBuilder.make()
        .root({ label: ['activity-actions.label', { ns: AgentNamespace.key }] })
        // The panel's name leads and takes the free space, which keeps the actions at the end.
        .text('title', { label: ['activity-companion.label', { ns: AgentNamespace.key }] })
        .action(
          'refresh',
          {
            label: ['activity-refresh.label', { ns: AgentNamespace.key }],
            icon: 'ph--arrows-counter-clockwise--regular',
            disabled: busy,
          },
          () => onRefresh?.(),
        )
        .action(
          running ? 'stop' : 'start',
          {
            label: [running ? 'activity-stop.label' : 'activity-start.label', { ns: AgentNamespace.key }],
            icon: running ? 'ph--plugs-connected--regular' : 'ph--plugs--regular',
            disabled: busy || (!running && !connectable),
          },
          () => (running ? onStop : onStart)?.(),
        )
        .build(),
    [running, connectable, busy, onStart, onStop, onRefresh],
  );

  return <ActionToolbar {...menuActions} attendableId={attendableId} alwaysActive={attendableId === undefined} />;
};

AgentActivityToolbar.displayName = 'AgentActivity.Toolbar';

//
// List
//

type AgentActivityListProps = PropsWithChildren<{
  /** Section heading. */
  label: string;
  /** The ids of the rows, in order. */
  ids: readonly string[];
  /** Shown in place of the rows when there are none. */
  empty: string;
}>;

/** A labelled list of rows; Channels, Skills and Conversations share it so their headings and rows align. */
const AgentActivityList = ({ label, ids, empty, children }: AgentActivityListProps) => (
  <Fieldset.Root>
    <Fieldset.Legend>{label}</Fieldset.Legend>
    {ids.length === 0 ? (
      <Typography.Text tone='muted'>{empty}</Typography.Text>
    ) : (
      // Rows render their own text, so an option carries only the id Ark keys it by.
      <Listbox.Root items={ids.map((id) => ({ value: id, label: id }))}>
        <Listbox.Content>{children}</Listbox.Content>
      </Listbox.Root>
    )}
  </Fieldset.Root>
);

AgentActivityList.displayName = 'AgentActivity.List';

//
// Agent
//

type AgentActivityAgentProps = {
  id: string;
  name?: string;
};

/** Which agent the panel is about: its name, and the object id EDGE and the bindings refer to it by. */
const AgentActivityAgent = ({ id, name }: AgentActivityAgentProps) => {
  const { t } = Hooks.useTranslation(AgentNamespace.key);
  return (
    <AgentActivityList label={t('agent.heading')} ids={[id]} empty=''>
      <Listbox.Item id={id}>
        <Listbox.ItemIcon icon='ph--robot--regular' />
        <Listbox.ItemText>{name || t('agent-unnamed.label')}</Listbox.ItemText>
        <Listbox.ItemDescription classNames='font-mono'>{id}</Listbox.ItemDescription>
      </Listbox.Item>
    </AgentActivityList>
  );
};

AgentActivityAgent.displayName = 'AgentActivity.Agent';

//
// Channels
//

type AgentActivityChannelsProps = PropsWithChildren<{
  ids: readonly string[];
}>;

/** The channels the agent converses in; children are {@link AgentActivityChannel} rows. */
const AgentActivityChannels = ({ ids, children }: AgentActivityChannelsProps) => {
  const { t } = Hooks.useTranslation(AgentNamespace.key);
  return (
    <AgentActivityList label={t('channels.label')} ids={ids} empty={t('channels-empty.message')}>
      {children}
    </AgentActivityList>
  );
};

AgentActivityChannels.displayName = 'AgentActivity.Channels';

//
// Channel
//

type AgentActivityChannelProps = {
  id: string;
  name?: string;
  /** The connection's state, e.g. `ready`, or why it last failed. */
  detail?: string;
  /** The channel the agent lists is not in the space (deleted); the row stays so it can be removed. */
  missing?: boolean;
  onRemove?: (id: string) => void;
};

/** One channel the agent converses in. */
const AgentActivityChannel = ({ id, name, detail, missing = false, onRemove }: AgentActivityChannelProps) => {
  const { t } = Hooks.useTranslation(AgentNamespace.key);
  return (
    <Listbox.Item id={id} classNames='dx-hover'>
      <Listbox.ItemIcon icon='ph--hash--regular' />
      <Listbox.ItemText>{missing ? t('channel-missing.label') : name || t('channel-unnamed.label')}</Listbox.ItemText>
      {!missing && detail && <Listbox.ItemDescription>{detail}</Listbox.ItemDescription>}
      <RowButton icon='ph--x--regular' label={t('channel-remove.label')} onClick={() => onRemove?.(id)} />
    </Listbox.Item>
  );
};

AgentActivityChannel.displayName = 'AgentActivity.Channel';

//
// Skills
//

type AgentActivitySkillsProps = PropsWithChildren<{
  /** The registry keys of the rows, in order. */
  ids: readonly string[];
}>;

/** The skills bound to the agent's conversation; children are {@link AgentActivitySkill} rows. */
const AgentActivitySkills = ({ ids, children }: AgentActivitySkillsProps) => {
  const { t } = Hooks.useTranslation(AgentNamespace.key);
  return (
    <AgentActivityList label={t('skills.heading')} ids={ids} empty={t('skills-empty.message')}>
      {children}
    </AgentActivityList>
  );
};

AgentActivitySkills.displayName = 'AgentActivity.Skills';

//
// Skill
//

type AgentActivitySkillProps = {
  /** The skill's registry key. */
  id: string;
  name: string;
  /** Opens the skill; absent for a built-in skill, which has no object to open. */
  onOpen?: (id: string) => void;
};

/** One skill the agent runs. */
const AgentActivitySkill = ({ id, name, onOpen }: AgentActivitySkillProps) => (
  <Listbox.Item id={id} onClick={onOpen ? () => onOpen(id) : undefined} classNames='dx-hover'>
    <Listbox.ItemIcon icon='ph--blueprint--regular' />
    <Listbox.ItemText>{name}</Listbox.ItemText>
  </Listbox.Item>
);

AgentActivitySkill.displayName = 'AgentActivity.Skill';

//
// Conversations
//

type AgentActivityConversationsProps = PropsWithChildren<{
  /** The ids of the rows, in order. */
  ids: readonly string[];
}>;

/** The agent's conversations bridged from its channels; children are {@link AgentActivityConversation} rows. */
const AgentActivityConversations = ({ ids, children }: AgentActivityConversationsProps) => {
  const { t } = Hooks.useTranslation(AgentNamespace.key);
  return (
    <AgentActivityList label={t('conversations.heading')} ids={ids} empty={t('conversations-empty.message')}>
      {children}
    </AgentActivityList>
  );
};

AgentActivityConversations.displayName = 'AgentActivity.Conversations';

//
// Conversation
//

type AgentActivityConversationProps = {
  id: string;
  title?: string;
  /** When the conversation last had a message; absent before its first. */
  lastActivity?: Typography.TimestampProps['date'];
  /** Fixes the instant timestamps are measured against, so stories and tests do not drift. */
  now?: Date;
  onSelect?: (id: string) => void;
  onDelete?: (id: string) => void;
};

/** One channel conversation (a channel, thread or DM) the agent converses in. */
const AgentActivityConversation = ({
  id,
  title,
  lastActivity,
  now,
  onSelect,
  onDelete,
}: AgentActivityConversationProps) => {
  const { t } = Hooks.useTranslation(AgentNamespace.key);
  return (
    <Listbox.Item id={id} onClick={() => onSelect?.(id)} classNames='dx-hover'>
      <Listbox.ItemIcon icon='ph--chat-circle-dots--regular' />
      <Listbox.ItemText>{title || t('conversation-untitled.label')}</Listbox.ItemText>
      {lastActivity !== undefined && (
        <Listbox.ItemDescription>
          <Typography.Timestamp date={lastActivity} now={now} />
        </Listbox.ItemDescription>
      )}
      {onDelete && (
        <RowButton icon='ph--trash--regular' label={t('conversation-delete.label')} onClick={() => onDelete(id)} />
      )}
    </Listbox.Item>
  );
};

AgentActivityConversation.displayName = 'AgentActivity.Conversation';

/** A row's icon action; it must not also trigger the row's own click. */
const RowButton = ({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) => (
  <Button.Root
    iconOnly
    variant='ghost'
    icon={icon}
    label={label}
    onClick={(event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      onClick();
    }}
  />
);

//
// AgentActivity
//

export const AgentActivity = {
  Root: AgentActivityRoot,
  Toolbar: AgentActivityToolbar,
  Agent: AgentActivityAgent,
  Channels: AgentActivityChannels,
  Channel: AgentActivityChannel,
  Skills: AgentActivitySkills,
  Skill: AgentActivitySkill,
  Conversations: AgentActivityConversations,
  Conversation: AgentActivityConversation,
};

export type {
  AgentActivityAgentProps,
  AgentActivityChannelProps,
  AgentActivityChannelsProps,
  AgentActivityConversationProps,
  AgentActivityConversationsProps,
  AgentActivityRootProps,
  AgentActivitySkillProps,
  AgentActivitySkillsProps,
  AgentActivityToolbarProps,
};
