//
// Copyright 2026 DXOS.org
//

import React, { type FC, useMemo, useState } from 'react';

import { Icon, Input, Panel, ScrollArea, Tag, Toolbar, type ThemedClassName } from '@dxos/react-ui';
import { Empty, Listbox } from '@dxos/react-ui-list';
import { type Type } from '@dxos/semantic-index';
import { mx } from '@dxos/ui-theme';
import { type ChromaticPalette, type MessageValence, type NeutralPalette } from '@dxos/ui-types';

export type SemanticFactsViewerProps = ThemedClassName<{ facts: Type.Fact[] }>;

/**
 * Read-only viewer for extracted semantic facts. Facts are grouped by subject entity and
 * conflicts (same subject + predicate, different objects) are highlighted as the headline signal.
 * Pure/presentational: no data fetching, no engine.
 */
export const SemanticFactsViewer: FC<SemanticFactsViewerProps> = ({ classNames, facts }) => {
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
        <ScrollArea.Root orientation='vertical'>
          <ScrollArea.Viewport classNames='flex flex-col gap-4'>
            {groups.length === 0 && <Empty icon='ph--list--regular' label='No facts.' />}
            {groups.map((group) => (
              <SubjectGroup key={group.subject} group={group} />
            ))}
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Content>
    </Panel.Root>
  );
};

const SubjectGroup: FC<{ group: Group }> = ({ group }) => (
  <div className='flex flex-col gap-2'>
    <div className='flex items-center gap-2'>
      <h3 className='p-2 text-sm font-medium'>{humanize(group.subject)}</h3>
      {group.conflicted && (
        <Tag palette='warning'>
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

const FactRow: FC<{ fact: Type.Fact; conflicting: boolean }> = ({ fact, conflicting }) => {
  const { assertion, valence, attribution } = fact;
  return (
    <Listbox.Item
      id={fact.id}
      classNames={mx('flex-col items-stretch gap-1 p-3', conflicting && 'border-is-2 border-warning-border')}
    >
      <div className='flex items-center justify-between gap-2'>
        <div className='flex items-center gap-1 flex-wrap'>
          <span className='font-medium'>{formatTerm(assertion.subject)}</span>
          <span className='text-subdued'>{assertion.predicate}</span>
          <span className='font-medium'>{formatTerm(assertion.object)}</span>
        </div>
        <div className='flex items-center gap-2 shrink-0'>
          {valence.confidence != null && (
            <span className='text-xs text-subdued'>{Math.round(valence.confidence * 100)}%</span>
          )}
          <Tag palette={factualityColor(valence.factuality)}>{valence.factuality}</Tag>
        </div>
      </div>

      <div className='text-xs text-subdued'>
        {[attribution.agent, attribution.source, formatDate(attribution.generatedAtTime)].filter(Boolean).join(' · ')}
      </div>

      {assertion.quote && <div className='text-sm text-description italic'>"{assertion.quote}"</div>}
    </Listbox.Item>
  );
};

//
// Helpers.
//

type Group = {
  subject: string;
  facts: Type.Fact[];
  conflicted: boolean;
  conflictedIds: Set<string>;
};

/** Group facts by subject entity and flag predicate-level conflicts within each group. */
const groupFacts = (facts: Type.Fact[], filter: string): Group[] => {
  const needle = filter.trim().toLowerCase();
  const filtered = needle
    ? facts.filter((fact) => {
        const { subject, predicate, object } = fact.assertion;
        return [termLabel(subject), predicate, termLabel(object)].some((value) => value.toLowerCase().includes(needle));
      })
    : facts;

  const bySubject = new Map<string, Type.Fact[]>();
  for (const fact of filtered) {
    const key = termLabel(fact.assertion.subject);
    const list = bySubject.get(key) ?? [];
    list.push(fact);
    bySubject.set(key, list);
  }

  return [...bySubject.entries()].map(([subject, groupFactsList]) => {
    const conflictedIds = new Set<string>();
    const byPredicate = new Map<string, Type.Fact[]>();
    for (const fact of groupFactsList) {
      const list = byPredicate.get(fact.assertion.predicate) ?? [];
      list.push(fact);
      byPredicate.set(fact.assertion.predicate, list);
    }
    for (const list of byPredicate.values()) {
      const objects = new Set(list.map((fact) => termLabel(fact.assertion.object)));
      if (objects.size > 1) {
        for (const fact of list) {
          conflictedIds.add(fact.id);
        }
      }
    }
    return { subject, facts: groupFactsList, conflicted: conflictedIds.size > 0, conflictedIds };
  });
};

const termLabel = (term: Type.Term): string => ('entity' in term ? term.entity : term.literal);

/** Prettify entity ids for display; render literal values verbatim. */
const formatTerm = (term: Type.Term): string => ('entity' in term ? humanize(term.entity) : term.literal);

/** Render ids like `q3-board-meeting` as `Q3 Board Meeting`. */
const humanize = (value: string): string => value.replace(/[-_]/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

const formatDate = (iso: string): string => iso.slice(0, 10);

/** Map FactBank factuality to a real react-ui palette member. */
const factualityColor = (factuality: Type.Factuality): NeutralPalette | ChromaticPalette | MessageValence => {
  switch (factuality) {
    case 'CT+':
      return 'emerald';
    case 'PR+':
      return 'amber';
    case 'PS+':
      return 'sky';
    case 'CT-':
    case 'PR-':
    case 'PS-':
      return 'red';
    case 'CTu':
    case 'Uu':
    default:
      return 'neutral';
  }
};
