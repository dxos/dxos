//
// Copyright 2026 DXOS.org
//

import React, { type MouseEvent, type PropsWithChildren, type ReactNode } from 'react';

import { Section } from '@dxos/react-ui-components';
import { Listbox } from '@dxos/react-ui-list';
import { ActionToolbar, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Layout from '@dxos/react-ui/Layout';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import * as Typography from '@dxos/react-ui/Typography';

import { meta } from '#meta';

//
// Root
//

type AgentActivityRootProps = PropsWithChildren<{
  role?: string;
  toolbar?: ReactNode;
}>;

/** The agent's activity panel: its channels, skills and conversations in one scrolling body. */
const AgentActivityRoot = ({ role, toolbar, children }: AgentActivityRootProps) => (
  <Panel.Root role={role}>
    {toolbar && <Panel.Header>{toolbar}</Panel.Header>}
    <Panel.Body asChild>
      <ScrollArea.Root orientation='vertical'>
        <ScrollArea.Viewport asChild>
          <Layout.Container gap='lg'>{children}</Layout.Container>
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    </Panel.Body>
  </Panel.Root>
);

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

/** Connects the agent's channels (or reconnects them), disconnects them, and re-reads the panel. */
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
        .root({ label: ['activity-actions.label', { ns: meta.profile.key }] })
        .action(
          'stop',
          {
            label: ['activity-stop.label', { ns: meta.profile.key }],
            icon: 'ph--plugs-connected--regular',
            disabled: busy || !running,
          },
          () => onStop?.(),
        )
        .action(
          'refresh',
          {
            label: ['activity-refresh.label', { ns: meta.profile.key }],
            icon: 'ph--arrows-counter-clockwise--regular',
            disabled: busy,
          },
          () => onRefresh?.(),
        )
        .action(
          'start',
          {
            // Reconfigures running connections, so the label follows the state.
            label: [running ? 'activity-restart.label' : 'activity-start.label', { ns: meta.profile.key }],
            icon: running ? 'ph--arrow-clockwise--regular' : 'ph--plugs--regular',
            disabled: busy || !connectable,
          },
          () => onStart?.(),
        )
        .build(),
    [running, connectable, busy, onStart, onStop, onRefresh],
  );

  const { t } = Hooks.useTranslation(meta.profile.key);
  return (
    <ActionToolbar
      {...menuActions}
      attendableId={attendableId}
      alwaysActive={attendableId === undefined}
      // The panel's name leads, and the gap pushes the actions to the end.
      start={
        <>
          <Toolbar.Text>{t('activity-companion.label')}</Toolbar.Text>
          <Toolbar.Separator variant='gap' />
        </>
      }
    />
  );
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
  <Section.Root>
    <Section.Label>{label}</Section.Label>
    {ids.length === 0 ? (
      <Section.Empty>{empty}</Section.Empty>
    ) : (
      // Rows render their own text, so an option carries only the id Ark keys it by.
      <Listbox.Root items={ids.map((id) => ({ value: id, label: id }))}>
        <Listbox.Content scroll={false}>{children}</Listbox.Content>
      </Listbox.Root>
    )}
  </Section.Root>
);

AgentActivityList.displayName = 'AgentActivity.List';

//
// Channels
//

type AgentActivityChannelsProps = PropsWithChildren<{
  ids: readonly string[];
}>;

/** The channels the agent converses in; children are {@link AgentActivityChannel} rows. */
const AgentActivityChannels = ({ ids, children }: AgentActivityChannelsProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
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
  onRemove?: (id: string) => void;
};

/** One channel the agent converses in. */
const AgentActivityChannel = ({ id, name, detail, onRemove }: AgentActivityChannelProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  return (
    <Listbox.Item id={id}>
      <Listbox.ItemIcon icon='ph--hash--regular' />
      <Listbox.ItemText>{name || t('channel-unnamed.label')}</Listbox.ItemText>
      {detail && <Listbox.ItemDescription>{detail}</Listbox.ItemDescription>}
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
  const { t } = Hooks.useTranslation(meta.profile.key);
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
  <Listbox.Item id={id} onClick={onOpen ? () => onOpen(id) : undefined}>
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
  const { t } = Hooks.useTranslation(meta.profile.key);
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
  const { t } = Hooks.useTranslation(meta.profile.key);
  return (
    <Listbox.Item id={id} onClick={() => onSelect?.(id)}>
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
  Channels: AgentActivityChannels,
  Channel: AgentActivityChannel,
  Skills: AgentActivitySkills,
  Skill: AgentActivitySkill,
  Conversations: AgentActivityConversations,
  Conversation: AgentActivityConversation,
};

export type {
  AgentActivityChannelProps,
  AgentActivityChannelsProps,
  AgentActivityConversationProps,
  AgentActivityConversationsProps,
  AgentActivityRootProps,
  AgentActivitySkillProps,
  AgentActivitySkillsProps,
  AgentActivityToolbarProps,
};
