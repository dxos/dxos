//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren, type ReactNode } from 'react';

import { Flex, Panel, ScrollArea, Tag, Toolbar, useTranslation } from '@dxos/react-ui';
import { Listbox } from '@dxos/react-ui-list';

import { meta } from '#meta';

//
// Root
//

type AgentStateRootProps = PropsWithChildren<{
  role?: string;
  name?: string;
  /** Extra toolbar items after the name, e.g. a host's actions on the agent. */
  actions?: ReactNode;
}>;

/** The agent's state panel: its name above a scrolling body of identity, counts and conversations. */
const AgentStateRoot = ({ role, name, actions, children }: AgentStateRootProps) => {
  const { t } = useTranslation(meta.profile.key);
  return (
    <Panel.Root role={role}>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Toolbar.Text>{name || t('agent-state-unnamed.label')}</Toolbar.Text>
          {actions}
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content asChild>
        <ScrollArea.Root orientation='vertical'>
          <ScrollArea.Viewport>{children}</ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Content>
    </Panel.Root>
  );
};

AgentStateRoot.displayName = 'AgentState.Root';

//
// Section
//

type AgentStateSectionProps = PropsWithChildren<{ heading: string }>;

const AgentStateSection = ({ heading, children }: AgentStateSectionProps) => (
  <Flex asChild column>
    <section aria-label={heading}>
      <h3 className='px-2 text-sm text-description'>{heading}</h3>
      {children}
    </section>
  </Flex>
);

//
// Identity
//

type AgentStateSkill = { key: string; name: string };

type AgentStateIdentityProps = {
  did?: string;
  /** The skills bound to the agent's conversation, which together are its current mode. */
  skills: readonly AgentStateSkill[];
};

/** Who the agent is and the mode its bound skills put it in. */
const AgentStateIdentity = ({ did, skills }: AgentStateIdentityProps) => {
  const { t } = useTranslation(meta.profile.key);
  return (
    <AgentStateSection heading={t('agent-state-identity.heading')}>
      <Listbox.Root>
        <Listbox.Content>
          <Listbox.Item id='did'>
            <Listbox.ItemContent
              icon='ph--fingerprint--regular'
              title={t('agent-state-did.label')}
              description={
                did ? <span className='font-mono break-all'>{did}</span> : t('agent-state-did-missing.label')
              }
            />
          </Listbox.Item>
          <Listbox.Item id='mode'>
            <Listbox.ItemContent
              icon='ph--blueprint--regular'
              title={t('agent-state-mode.label')}
              description={
                skills.length === 0 ? (
                  t('agent-state-mode-empty.label')
                ) : (
                  <Flex asChild wrap gap='xs'>
                    <span>
                      {skills.map((skill) => (
                        <Tag key={skill.key} hue='violet'>
                          {skill.name}
                        </Tag>
                      ))}
                    </span>
                  </Flex>
                )
              }
            />
          </Listbox.Item>
        </Listbox.Content>
      </Listbox.Root>
    </AgentStateSection>
  );
};

AgentStateIdentity.displayName = 'AgentState.Identity';

//
// Summary
//

type AgentStateCounts = {
  memories: { active: number; expired: number };
  goals: { proposed: number; confirmed: number };
  people: number;
  organizations: number;
  conversations: number;
  /** Absent when the agent keeps no task list. */
  tasks?: { open: number; total: number };
};

type AgentStateSummaryProps = { counts: AgentStateCounts };

/** How much the agent knows and is tracking. */
const AgentStateSummary = ({ counts }: AgentStateSummaryProps) => {
  const { t } = useTranslation(meta.profile.key);
  const rows = [
    {
      id: 'memories',
      icon: 'ph--brain--regular',
      title: t('agent-state-memories.label'),
      value: counts.memories.active + counts.memories.expired,
      description: t('agent-state-memories.description', counts.memories),
    },
    {
      id: 'goals',
      icon: 'ph--target--regular',
      title: t('agent-state-goals.label'),
      value: counts.goals.confirmed + counts.goals.proposed,
      description: t('agent-state-goals.description', counts.goals),
    },
    { id: 'people', icon: 'ph--user--regular', title: t('agent-state-people.label'), value: counts.people },
    {
      id: 'organizations',
      icon: 'ph--buildings--regular',
      title: t('agent-state-organizations.label'),
      value: counts.organizations,
    },
    {
      id: 'conversations',
      icon: 'ph--chats-circle--regular',
      title: t('agent-state-conversations.label'),
      value: counts.conversations,
    },
    ...(counts.tasks
      ? [
          {
            id: 'tasks',
            icon: 'ph--check-square--regular',
            title: t('agent-state-tasks.label'),
            value: counts.tasks.open,
            description: t('agent-state-tasks.description', counts.tasks),
          },
        ]
      : []),
  ];

  return (
    <AgentStateSection heading={t('agent-state-summary.heading')}>
      <Listbox.Root>
        <Listbox.Content>
          {rows.map(({ id, icon, title, value, description }) => (
            <Listbox.Item key={id} id={id} classNames='gap-2'>
              <Listbox.ItemContent classNames='grow' icon={icon} title={title} description={description} />
              <span className='text-lg tabular-nums' data-testid={`agent-state-${id}`}>
                {value}
              </span>
            </Listbox.Item>
          ))}
        </Listbox.Content>
      </Listbox.Root>
    </AgentStateSection>
  );
};

AgentStateSummary.displayName = 'AgentState.Summary';

//
// Conversations
//

type AgentStateChannel = {
  id: string;
  /** The chat's name, or the person it is with. */
  name?: string;
  /** The name of the chat's current mode. */
  mode: string;
  /** The skills the chat binds. */
  skills: readonly AgentStateSkill[];
};

type AgentStateConversationsProps = { channels: readonly AgentStateChannel[] };

/** Each conversation the agent holds and the mode it is in there. */
const AgentStateConversations = ({ channels }: AgentStateConversationsProps) => {
  const { t } = useTranslation(meta.profile.key);
  if (channels.length === 0) {
    return null;
  }

  return (
    <AgentStateSection heading={t('agent-state-conversations.label')}>
      <Listbox.Root>
        <Listbox.Content>
          {channels.map((channel) => (
            <Listbox.Item key={channel.id} id={channel.id} data-testid={`agent-state-channel-${channel.id}`}>
              <Listbox.ItemContent
                icon='ph--chat-circle--regular'
                title={channel.name || t('agent-state-channel-unnamed.label')}
                description={
                  <Flex asChild wrap gap='xs'>
                    <span>
                      <Tag hue='sky' data-testid='agent-state-channel-mode'>
                        {t('agent-state-channel-mode.label', { mode: channel.mode })}
                      </Tag>
                      {channel.skills.map((skill) => (
                        <Tag key={skill.key} hue='violet'>
                          {skill.name}
                        </Tag>
                      ))}
                    </span>
                  </Flex>
                }
              />
            </Listbox.Item>
          ))}
        </Listbox.Content>
      </Listbox.Root>
    </AgentStateSection>
  );
};

AgentStateConversations.displayName = 'AgentState.Conversations';

//
// AgentState
//

export const AgentState = {
  Root: AgentStateRoot,
  Identity: AgentStateIdentity,
  Summary: AgentStateSummary,
  Conversations: AgentStateConversations,
};

export type {
  AgentStateChannel,
  AgentStateConversationsProps,
  AgentStateCounts,
  AgentStateIdentityProps,
  AgentStateRootProps,
  AgentStateSkill,
  AgentStateSummaryProps,
};
