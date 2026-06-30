//
// Copyright 2026 DXOS.org
//

import React, { useMemo, useState } from 'react';

import { Icon, Input, Panel, ScrollArea, Tag, type ThemedClassName, Toolbar } from '@dxos/react-ui';
import { Empty, Listbox } from '@dxos/react-ui-list';
import { type Type } from '@dxos/semantic-index';
import { mx } from '@dxos/ui-theme';

import { Group, factualityColor, formatDate, formatTerm, groupFacts, humanize } from './util';

export type SemanticFactsViewerProps = ThemedClassName<{
  facts: Type.Fact[];
}>;

/**
 * Read-only viewer for extracted semantic facts. Facts are grouped by subject entity and
 * conflicts (same subject + predicate, different objects) are highlighted as the headline signal.
 * Pure/presentational: no data fetching, no engine.
 */
export const SemanticFactsViewer = ({ classNames, facts }: SemanticFactsViewerProps) => {
  const [filter, setFilter] = useState('');
  const groups = useMemo(() => groupFacts(facts, filter), [facts, filter]);

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
        </Toolbar.Root>
      </Panel.Toolbar>
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
    </Panel.Root>
  );
};

const SubjectGroup = ({ group }: { group: Group }) => (
  <div className='shrink-0 flex flex-col bg-card-surface border border-subdued-separator rounded-sm overflow-hidden'>
    <div className='flex px-3 py-1 items-center justify-between'>
      <h3>{humanize(group.subject)}</h3>
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
      <Listbox.Content aria-label={humanize(group.subject)}>
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
