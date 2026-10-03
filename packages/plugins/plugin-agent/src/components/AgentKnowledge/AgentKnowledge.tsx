//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from 'react';

import { type Obj } from '@dxos/echo';
import { ForceGraph } from '@dxos/plugin-explorer/components';
import { Flex, Panel, ScrollArea, Tabs, Timestamp, type TimestampProps, Toolbar, useTranslation } from '@dxos/react-ui';
import { Listbox } from '@dxos/react-ui-list';
import { type SpaceGraphEdge, SpaceGraphModel, type SpaceGraphNode } from '@dxos/schema';

import { meta } from '#meta';
import { type Memory } from '#types';

import { MEMORY_ICONS } from '../ProfileGraph/index.ts';

//
// Root
//

type AgentKnowledgeView = 'memories' | 'graph';

const AgentKnowledgeContext = createContext<AgentKnowledgeView>('memories');

type AgentKnowledgeRootProps = PropsWithChildren<{
  role?: string;
  defaultView?: AgentKnowledgeView;
}>;

/** What the agent knows, one view at a time: its memories and its knowledge graph. */
const AgentKnowledgeRoot = ({ role, defaultView = 'memories', children }: AgentKnowledgeRootProps) => {
  const { t } = useTranslation(meta.profile.key);
  const [view, setView] = useState<AgentKnowledgeView>(defaultView);
  return (
    <Tabs.Root
      asChild
      orientation='horizontal'
      value={view}
      onValueChange={(value) => setView(value === 'graph' ? 'graph' : 'memories')}
    >
      <Panel.Root role={role}>
        <Panel.Toolbar asChild>
          <Toolbar.Root>
            <Tabs.Tablist>
              <Tabs.Button value='memories' data-testid='agent-knowledge-tab-memories'>
                {t('agent-knowledge-memories.label')}
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
// Memories
//

type AgentKnowledgeMemory = Pick<Memory.Memory, 'id' | 'content' | 'kind' | 'observedAt'>;

type AgentKnowledgeMemoriesProps = {
  /** Newest first. */
  memories: readonly AgentKnowledgeMemory[];
  /** Fixes the instant timestamps are measured against, so stories and tests do not drift. */
  now?: TimestampProps['now'];
};

/** The agent's active memories, newest first. */
const AgentKnowledgeMemories = ({ memories, now }: AgentKnowledgeMemoriesProps) => {
  const { t } = useTranslation(meta.profile.key);
  if (useContext(AgentKnowledgeContext) !== 'memories') {
    return null;
  }

  return memories.length === 0 ? (
    <Flex center classNames='p-2 text-description' role='status'>
      {t('agent-knowledge-memories-empty.message')}
    </Flex>
  ) : (
    <ScrollArea.Root orientation='vertical'>
      <ScrollArea.Viewport>
        <Listbox.Root>
          <Listbox.Content>
            {memories.map((memory) => (
              <Listbox.Item key={memory.id} id={memory.id}>
                <Listbox.ItemContent
                  icon={MEMORY_ICONS[memory.kind]}
                  title={memory.content}
                  description={
                    <>
                      {t(`memory-kind-${memory.kind}.label`)} · <Timestamp date={memory.observedAt} now={now} />
                    </>
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

AgentKnowledgeMemories.displayName = 'AgentKnowledge.Memories';

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
  Memories: AgentKnowledgeMemories,
  Graph: AgentKnowledgeGraph,
};

export type {
  AgentKnowledgeEdge,
  AgentKnowledgeGraphProps,
  AgentKnowledgeMemoriesProps,
  AgentKnowledgeMemory,
  AgentKnowledgeNode,
  AgentKnowledgeRootProps,
  AgentKnowledgeView,
};
