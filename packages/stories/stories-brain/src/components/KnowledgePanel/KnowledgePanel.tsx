//
// Copyright 2026 DXOS.org
//

import React, { useMemo, useState } from 'react';

import { type RDF } from '@dxos/pipeline-rdf';
import { ENTITY_HUES, EntityBrowser, toEntityCards } from '@dxos/react-ui-rdf';
import * as Button from '@dxos/react-ui/Button';
import * as Panel from '@dxos/react-ui/Panel';
import * as Status from '@dxos/react-ui/Status';
import * as Tabs from '@dxos/react-ui/Tabs';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import type * as Util from '@dxos/react-ui/Util';

import { OntologyPanel } from '../OntologyPanel/index.ts';

type KnowledgeView = 'entities' | 'ontology';

const isView = (value: string): value is KnowledgeView => value === 'entities' || value === 'ontology';

export type KnowledgePanelProps = Util.ThemedClassName<{
  facts: RDF.Fact[];
  /** The store's predicates; undefined until read. */
  ontology?: RDF.Ontology.Ontology;
  /** The chosen entity's slug. */
  selected?: string;
  onSelect: (id: string | undefined) => void;
  /** The chosen predicate's IRI. */
  predicate?: string;
  onPredicateChange: (iri: string | undefined) => void;
  defaultView?: KnowledgeView;
}>;

/**
 * What the facts are about, one view at a time: the entities they relate, as Finder-style entity cards, or the
 * store's predicate pool, most used first. Choosing an entity or a predicate scopes the facts view.
 */
export const KnowledgePanel = ({
  classNames,
  facts,
  ontology,
  selected,
  onSelect,
  predicate,
  onPredicateChange,
  defaultView = 'entities',
}: KnowledgePanelProps) => {
  const [view, setView] = useState<KnowledgeView>(defaultView);
  // Objects get cards too (an employer, a channel), so every chip opens one.
  const cards = useMemo(() => toEntityCards(facts, { objects: true }), [facts]);

  return (
    <Tabs.Root asChild orientation='horizontal' value={view} onValueChange={(value) => isView(value) && setView(value)}>
      <Panel.Root classNames={classNames}>
        <Panel.Header>
          <Toolbar.Root>
            <Tabs.List>
              <Tabs.Trigger value='entities' data-testid='knowledge-panel.entities'>
                Entities{cards.length > 0 ? ` (${cards.length})` : ''}
              </Tabs.Trigger>
              <Tabs.Trigger value='ontology' data-testid='knowledge-panel.ontology'>
                Ontology{ontology ? ` (${ontology.entries.length})` : ''}
              </Tabs.Trigger>
            </Tabs.List>
            <Toolbar.Separator variant='gap' />
            {view === 'entities' && (
              <Button.Root
                icon='ph--x--regular'
                iconOnly
                label='Clear entity'
                disabled={!selected}
                onClick={() => onSelect(undefined)}
              />
            )}
          </Toolbar.Root>
        </Panel.Header>
        {view === 'entities' ? (
          cards.length === 0 ? (
            <Panel.Body>
              <Status.Empty>No entities.</Status.Empty>
            </Panel.Body>
          ) : (
            <Panel.Body asChild>
              <EntityBrowser cards={cards} hues={ENTITY_HUES} selected={selected} onSelect={onSelect} />
            </Panel.Body>
          )
        ) : ontology ? (
          <Panel.Body asChild>
            <OntologyPanel ontology={ontology} facts={facts} selected={predicate} onSelect={onPredicateChange} />
          </Panel.Body>
        ) : (
          <Panel.Body>
            <Status.Empty>Reading predicates…</Status.Empty>
          </Panel.Body>
        )}
      </Panel.Root>
    </Tabs.Root>
  );
};
