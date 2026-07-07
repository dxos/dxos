//
// Copyright 2026 DXOS.org
//

import React, { useMemo, useState } from 'react';

import { type RDF } from '@dxos/pipeline-rdf';
import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { EntityList } from '../EntityList';
import { FactViewer } from '../FactViewer';
import { PredicateList } from '../PredicateList';
import { entitiesFromFacts, predicatesFromFacts } from '../types';

export type FactPanelProps = ThemedClassName<{
  facts: RDF.Fact[];
}>;

/**
 * Composite view over extracted facts: the {@link FactViewer} scoped by a selected entity (from the
 * {@link EntityList}) and a selected predicate (from the {@link PredicateList}). Owns the shared
 * entity/predicate selection state so callers pass only the facts.
 */
export const FactPanel = ({ classNames, facts }: FactPanelProps) => {
  const [context, setContext] = useState<string | undefined>(undefined);
  const [predicate, setPredicate] = useState<string | undefined>(undefined);
  const entities = useMemo(() => entitiesFromFacts(facts), [facts]);
  const predicates = useMemo(() => predicatesFromFacts(facts), [facts]);

  return (
    <div role='none' className={mx('grid grid-rows-[2fr_1fr] gap-2 min-h-0', classNames)}>
      <FactViewer facts={facts} context={context} predicate={predicate} />
      <div className='grid grid-cols-[1fr_1fr]'>
        <EntityList entities={entities} selected={context} onSelect={setContext} />
        <PredicateList predicates={predicates} selected={predicate} onSelect={setPredicate} />
      </div>
    </div>
  );
};
