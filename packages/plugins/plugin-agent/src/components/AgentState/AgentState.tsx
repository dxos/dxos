//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren, type ReactNode, createContext, useContext, useState } from 'react';

import { Container, Flex, Panel, ScrollArea, Tabs, Tag, Toolbar, useTranslation } from '@dxos/react-ui';
import { Listbox } from '@dxos/react-ui-list';

import { meta } from '#meta';

//
// Root
//

type AgentStateView = 'identity' | 'state' | 'conversations';

const AGENT_STATE_VIEWS: readonly AgentStateView[] = ['identity', 'state', 'conversations'];

const AgentStateContext = createContext<AgentStateView>('identity');

type AgentStateRootProps = PropsWithChildren<{
  role?: string;
  /** Extra toolbar items after the tabs, e.g. a host's actions on the agent. */
  actions?: ReactNode;
  defaultView?: AgentStateView;
}>;

/** The agent's state panel: tabs over its identity, counts and conversations. */
const AgentStateRoot = ({ role, actions, defaultView = 'identity', children }: AgentStateRootProps) => {
  const { t } = useTranslation(meta.profile.key);
  const [view, setView] = useState<AgentStateView>(defaultView);
  return (
    <Tabs.Root
      asChild
      orientation='horizontal'
      value={view}
      onValueChange={(value) => setView(AGENT_STATE_VIEWS.find((candidate) => candidate === value) ?? 'identity')}
    >
      <Panel.Root role={role}>
        <Panel.Header>
          <Toolbar.Root>
            <Tabs.List>
              {AGENT_STATE_VIEWS.map((value) => (
                <Tabs.Trigger key={value} value={value} data-testid={`agent-state-tab-${value}`}>
                  {t(`agent-state-${value}.heading`)}
                </Tabs.Trigger>
              ))}
            </Tabs.List>
            {actions}
          </Toolbar.Root>
        </Panel.Header>
        <Panel.Body asChild>
          <ScrollArea.Root orientation='vertical'>
            <ScrollArea.Viewport asChild>
              <Container>
                <AgentStateContext.Provider value={view}>{children}</AgentStateContext.Provider>
              </Container>
            </ScrollArea.Viewport>
          </ScrollArea.Root>
        </Panel.Body>
      </Panel.Root>
    </Tabs.Root>
  );
};

AgentStateRoot.displayName = 'AgentState.Root';

//
// Section
//

type AgentStateSectionProps = PropsWithChildren<{ view: AgentStateView; label: string }>;

/** One tab's content; inactive tabs stay mounted but hidden so their state and test ids persist. */
const AgentStateSection = ({ view, label, children }: AgentStateSectionProps) => {
  const active = useContext(AgentStateContext) === view;
  return (
    <Container asChild>
      <section aria-label={label} hidden={!active}>
        {children}
      </section>
    </Container>
  );
};

//
// Identity
//

type AgentStateSkill = { key: string; name: string };

type AgentStateIdentityProps = {
  did?: string;
  /** The base skills every conversation binds; each conversation's mode adds more (see Conversations). */
  skills: readonly AgentStateSkill[];
};

/** Who the agent is and the base skills it brings to every conversation. */
const AgentStateIdentity = ({ did, skills }: AgentStateIdentityProps) => {
  const { t } = useTranslation(meta.profile.key);
  return (
    <AgentStateSection view='identity' label={t('agent-state-identity.heading')}>
      <Listbox.Root
        items={[
          { value: 'did', label: t('agent-state-did.label'), icon: 'ph--fingerprint--regular' },
          { value: 'skills', label: t('agent-state-skills.label'), icon: 'ph--sparkle--regular' },
        ]}
      >
        <Listbox.Content scroll={false}>
          <Listbox.Item id='did'>
            <Listbox.ItemIcon />
            <Listbox.ItemText />
            <Listbox.ItemDescription classNames={did ? 'font-mono break-all' : undefined}>
              {did ?? t('agent-state-did-missing.label')}
            </Listbox.ItemDescription>
          </Listbox.Item>
          <Listbox.Item id='skills'>
            <Listbox.ItemIcon />
            <Listbox.ItemText />
            <Listbox.ItemDescription>
              {skills.length === 0 ? (
                t('agent-state-skills-empty.label')
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
              )}
            </Listbox.ItemDescription>
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
  /** Facts read from sources into annotation feeds; absent when none were read. */
  facts?: { count: number; sources: number };
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
    ...(counts.facts
      ? [
          {
            id: 'facts',
            icon: 'ph--graph--regular',
            title: t('agent-state-facts.label'),
            value: counts.facts.count,
            description: t('agent-state-facts.description', counts.facts),
          },
        ]
      : []),
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
    <AgentStateSection view='state' label={t('agent-state-state.heading')}>
      <Listbox.Root
        items={rows.map(({ id, icon, title, description }) => ({ value: id, label: title, icon, description }))}
      >
        <Listbox.Content scroll={false}>
          {rows.map(({ id, value, description }) => (
            <Listbox.Item key={id} id={id}>
              <Listbox.ItemIcon />
              <Listbox.ItemText />
              {description && <Listbox.ItemDescription />}
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
  return (
    <AgentStateSection view='conversations' label={t('agent-state-conversations.heading')}>
      {channels.length === 0 && (
        <Flex center classNames='p-2 text-fg-muted' role='status'>
          {t('agent-state-conversations-empty.message')}
        </Flex>
      )}
      <Listbox.Root
        items={channels.map((channel) => ({
          value: channel.id,
          label: channel.name || t('agent-state-channel-unnamed.label'),
          icon: 'ph--chat-circle--regular',
        }))}
      >
        <Listbox.Content scroll={false}>
          {channels.map((channel) => (
            <Listbox.Item key={channel.id} id={channel.id} data-testid={`agent-state-channel-${channel.id}`}>
              <Listbox.ItemIcon />
              <Listbox.ItemText />
              <Listbox.ItemDescription>
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
              </Listbox.ItemDescription>
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
  AgentStateView,
};
