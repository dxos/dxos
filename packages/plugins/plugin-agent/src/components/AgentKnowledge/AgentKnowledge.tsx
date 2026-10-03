//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from 'react';

import { type Obj } from '@dxos/echo';
import { ForceGraph } from '@dxos/plugin-explorer/components';
import { Flex, Panel, ScrollArea, Tabs, Tag, Toolbar, useTranslation } from '@dxos/react-ui';
import { Listbox } from '@dxos/react-ui-list';
import { type SpaceGraphEdge, SpaceGraphModel, type SpaceGraphNode } from '@dxos/schema';

import { meta } from '#meta';

import { type AgentStateSkill } from '../AgentState/index.ts';

//
// Root
//

type AgentKnowledgeView = 'conversations' | 'graph';

const AgentKnowledgeContext = createContext<AgentKnowledgeView>('conversations');

type AgentKnowledgeRootProps = PropsWithChildren<{
  role?: string;
  defaultView?: AgentKnowledgeView;
}>;

/** What the agent knows, one view at a time: the conversations it holds and its knowledge graph. */
const AgentKnowledgeRoot = ({ role, defaultView = 'conversations', children }: AgentKnowledgeRootProps) => {
  const { t } = useTranslation(meta.profile.key);
  const [view, setView] = useState<AgentKnowledgeView>(defaultView);
  return (
    <Tabs.Root
      asChild
      orientation='horizontal'
      value={view}
      onValueChange={(value) => setView(value === 'graph' ? 'graph' : 'conversations')}
    >
      <Panel.Root role={role}>
        <Panel.Toolbar asChild>
          <Toolbar.Root>
            <Tabs.Tablist>
              <Tabs.Button value='conversations' data-testid='agent-knowledge-tab-conversations'>
                {t('agent-knowledge-conversations.label')}
              </Tabs.Button>
              <Tabs.Button value='graph' data-testid='agent-knowledge-tab-graph'>
                {t('agent-knowledge-graph.label')}
              </Tabs.Button>
            </Tabs.Tablist>
          </Toolbar.Root>
        </Panel.Toolbar>
        {/* Views render themselves by hand rather than through `Tabs.Panel`, whose content mounts hidden
            for a frame, where the force graph would measure zero. */}
        <Panel.Content>
          <AgentKnowledgeContext.Provider value={view}>{children}</AgentKnowledgeContext.Provider>
        </Panel.Content>
      </Panel.Root>
    </Tabs.Root>
  );
};

AgentKnowledgeRoot.displayName = 'AgentKnowledge.Root';

//
// Conversations
//

type AgentKnowledgeChannel = {
  id: string;
  /** The chat's name, or the person it is with. */
  name?: string;
  /** The name of the chat's current mode. */
  mode: string;
  /** The skills the chat binds. */
  skills: readonly AgentStateSkill[];
};

type AgentKnowledgeConversationsProps = { channels: readonly AgentKnowledgeChannel[] };

/** Each conversation the agent holds and the mode it is in there. */
const AgentKnowledgeConversations = ({ channels }: AgentKnowledgeConversationsProps) => {
  const { t } = useTranslation(meta.profile.key);
  if (useContext(AgentKnowledgeContext) !== 'conversations') {
    return null;
  }

  if (channels.length === 0) {
    return (
      <Flex center classNames='p-2 text-description' role='status'>
        {t('agent-knowledge-conversations-empty.message')}
      </Flex>
    );
  }

  return (
    <ScrollArea.Root orientation='vertical'>
      <ScrollArea.Viewport>
        <Listbox.Root>
          <Listbox.Content>
            {channels.map((channel) => (
              <Listbox.Item key={channel.id} id={channel.id} data-testid={`agent-knowledge-channel-${channel.id}`}>
                <Listbox.ItemContent
                  icon='ph--chat-circle--regular'
                  title={channel.name || t('agent-knowledge-channel-unnamed.label')}
                  description={
                    <Flex asChild wrap gap='xs'>
                      <span>
                        <Tag hue='sky' data-testid='agent-knowledge-channel-mode'>
                          {t('agent-knowledge-channel-mode.label', { mode: channel.mode })}
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
      </ScrollArea.Viewport>
    </ScrollArea.Root>
  );
};

AgentKnowledgeConversations.displayName = 'AgentKnowledge.Conversations';

//
// Graph
//

type AgentKnowledgeNode = {
  id: string;
  label: string;
  /** Colors the node by its type; plain nodes render uncolored. */
  object?: Obj.Unknown;
};

type AgentKnowledgeEdge = {
  source: string;
  target: string;
  /** `subject`: memory → entity it is about; `owner`: goal → holder; `knows`: agent → entity. */
  kind: 'subject' | 'owner' | 'knows';
};

type AgentKnowledgeGraphProps = {
  nodes: readonly AgentKnowledgeNode[];
  edges: readonly AgentKnowledgeEdge[];
};

/** The agent's knowledge as a force-directed graph of people, organizations, goals and memories. */
const AgentKnowledgeGraph = ({ nodes, edges }: AgentKnowledgeGraphProps) => {
  const { t } = useTranslation(meta.profile.key);
  const active = useContext(AgentKnowledgeContext) === 'graph';
  // One model for the component's life, so the layout keeps its positions as the knowledge grows.
  const model = useMemo(() => new SpaceGraphModel(), []);
  useEffect(() => {
    const ids = new Set(nodes.map((node) => node.id));
    model.setGraph({
      nodes: nodes.map(({ id, label, object }): SpaceGraphNode => ({ id, type: 'object', data: { label, object } })),
      edges: edges
        .filter(({ source, target }) => ids.has(source) && ids.has(target))
        .map(({ source, target, kind }): SpaceGraphEdge => ({
          id: `${source}-${kind}-${target}`,
          type: kind,
          source,
          target,
        })),
    });
  }, [model, nodes, edges]);

  if (!active) {
    return null;
  }

  return nodes.length === 0 ? (
    <Flex center classNames='p-2 text-description' role='status'>
      {t('agent-knowledge-graph-empty.message')}
    </Flex>
  ) : (
    <ForceGraph classNames='h-full' model={model} />
  );
};

AgentKnowledgeGraph.displayName = 'AgentKnowledge.Graph';

//
// AgentKnowledge
//

export const AgentKnowledge = {
  Root: AgentKnowledgeRoot,
  Conversations: AgentKnowledgeConversations,
  Graph: AgentKnowledgeGraph,
};

export type {
  AgentKnowledgeChannel,
  AgentKnowledgeConversationsProps,
  AgentKnowledgeEdge,
  AgentKnowledgeGraphProps,
  AgentKnowledgeNode,
  AgentKnowledgeRootProps,
  AgentKnowledgeView,
};
