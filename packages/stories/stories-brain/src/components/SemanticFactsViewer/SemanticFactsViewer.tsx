//
// Copyright 2026 DXOS.org
//

import React, { useMemo, useState } from 'react';

import { Icon, IconButton, Input, Panel, ScrollArea, Tag, type ThemedClassName, Toolbar } from '@dxos/react-ui';
import { Tree } from '@dxos/react-ui-graph';
import { Empty, Listbox } from '@dxos/react-ui-list';
import { type Type, buildFactGraph, factSourceFromFacts } from '@dxos/semantic-index';
import { mx } from '@dxos/ui-theme';

import { Group, factualityColor, formatDate, formatTerm, graphToTreeNode, groupFacts, termKey } from '../util';

type View = 'list' | 'graph';

export type SemanticFactsViewerProps = ThemedClassName<{
  facts: Type.Fact[];
  /** Context entity id; scopes the list and roots the graph. */
  context?: string;
}>;

/**
 * Viewer for extracted semantic facts with two views: a grouped **list** (by subject entity, with
 * conflicts highlighted) and a **graph** (tidy tree rooted at the context entity, exploring the fact
 * graph). A `context` entity scopes the list and roots the graph. Pure/presentational.
 */
export const SemanticFactsViewer = ({ classNames, facts, context }: SemanticFactsViewerProps) => {
  const [filter, setFilter] = useState('');
  const [view, setView] = useState<View>('list');
  const scoped = useMemo(
    () =>
      context == null
        ? facts
        : facts.filter(
            (fact) => termKey(fact.assertion.subject) === context || termKey(fact.assertion.object) === context,
          ),
    [facts, context],
  );
  const groups = useMemo(() => groupFacts(scoped, filter), [scoped, filter]);
  const graph = useMemo(
    () => (context == null ? undefined : graphToTreeNode(buildFactGraph(context, factSourceFromFacts(facts)), context)),
    [facts, context],
  );

  return (
    <Panel.Root classNames={classNames}>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Input.Root>
            <Input.Label srOnly>Filter facts</Input.Label>
            <Input.TextInput
              placeholder='Filter by entity or predicate…'
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            />
          </Input.Root>
          <div role='none' className='grow' />
          <IconButton
            icon='ph--list--regular'
            iconOnly
            label='List view'
            variant={view === 'list' ? 'primary' : 'default'}
            onClick={() => setView('list')}
          />
          <IconButton
            icon='ph--graph--regular'
            iconOnly
            label='Graph view'
            variant={view === 'graph' ? 'primary' : 'default'}
            onClick={() => setView('graph')}
          />
        </Toolbar.Root>
      </Panel.Toolbar>
      {view === 'list' ? (
        <Panel.Content asChild>
          <ScrollArea.Root padding>
            <ScrollArea.Viewport classNames='flex flex-col gap-2 py-1'>
              {groups.length === 0 && <Empty label='No facts.' />}
              {groups.map((group) => (
                <SubjectGroup key={group.subject} group={group} />
              ))}
            </ScrollArea.Viewport>
          </ScrollArea.Root>
        </Panel.Content>
      ) : (
        <Panel.Content classNames='overflow-hidden'>
          {graph ? (
            <Tree data={graph} variant='tidy' margin={80} classNames='w-full h-full' />
          ) : (
            <Empty icon='ph--graph--regular' label='Select an entity to root the graph.' />
          )}
        </Panel.Content>
      )}
    </Panel.Root>
  );
};

const SubjectGroup = ({ group }: { group: Group }) => (
  <div className='shrink-0 flex flex-col bg-card-surface border border-subdued-separator rounded-sm overflow-hidden'>
    <div className='flex px-3 py-1 items-center justify-between'>
      <h3>{group.subject}</h3>
      {group.conflicted && (
        <Tag hue='warning'>
          <span className='flex items-center gap-1'>
            <Icon icon='ph--warning--regular' size={3} />
            conflict
          </span>
        </Tag>
      )}
    </div>
    <Listbox.Root>
      <Listbox.Content aria-label={group.subject}>
        {group.facts.map((fact) => (
          <FactRow key={fact.id} fact={fact} conflicting={group.conflictedIds.has(fact.id)} />
        ))}
      </Listbox.Content>
    </Listbox.Root>
  </div>
);

const cellClassNames =
  'bg-input-surface border border-subdued-separator rounded-sm px-2 py-0.5 font-medium whitespace-nowrap truncate';

const FactRow = ({ fact, conflicting }: { fact: Type.Fact; conflicting: boolean }) => {
  const { assertion, valence, attribution } = fact;
  return (
    <Listbox.Item
      id={fact.id}
      classNames={mx('flex flex-col items-stretch gap-2 px-3 py-1', conflicting && 'border-is-2 border-warning-border')}
    >
      {assertion.quote && <div className='text-sm text-description italic'>"{assertion.quote}"</div>}

      <div className='grid grid-cols-[1fr_5rem] items-center justify-between gap-2'>
        <div className='w-full grid grid-cols-[1fr_1rem_1fr_1rem_1fr] items-center flex-wrap'>
          <span className={mx(cellClassNames, 'text-right')}>{formatTerm(assertion.subject)}</span>
          <span className='border border-subdued-separator'></span>
          <span className={mx(cellClassNames, 'text-center text-description')}>{assertion.predicate}</span>
          <span className='border border-subdued-separator'></span>
          <span className={mx(cellClassNames)}>{formatTerm(assertion.object)}</span>
        </div>

        <div className='flex items-center justify-end gap-2 shrink-0'>
          {valence.confidence != null && (
            <span className='text-xs text-subdued'>{Math.round(valence.confidence * 100)}%</span>
          )}
          <Tag hue={factualityColor(valence.factuality)}>{valence.factuality}</Tag>
        </div>
      </div>

      <div className='text-xs text-subdued text-right'>
        {[attribution.agent, attribution.source, formatDate(attribution.generatedAtTime)].filter(Boolean).join(' · ')}
      </div>
    </Listbox.Item>
  );
};
