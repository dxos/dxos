//
// Copyright 2026 DXOS.org
//

import React, { useMemo, useState } from 'react';

import { type RDF } from '@dxos/pipeline-rdf';
import { FactViewer } from '@dxos/react-ui-rdf';
import * as Util from '@dxos/react-ui/Util';

import { EntityList } from '../EntityList/index.ts';
import { PredicateList } from '../PredicateList/index.ts';
import { entitiesFromFacts, predicatesFromFacts } from '../types.ts';

export type FactPanelProps = {
  facts: RDF.Fact[];
};

/**
 * Composite view over extracted facts: the {@link FactViewer} scoped by a selected entity (from the
 * {@link EntityList}) and a selected predicate (from the {@link PredicateList}). Owns the shared
 * entity/predicate selection state so callers pass only the facts.
 */
// Composable, so a host can slot it (`Panel.Body asChild`) and give it the body's height.
export const FactPanel = Util.composable<HTMLDivElement, FactPanelProps>(({ facts, ...props }, forwardedRef) => {
  const [context, setContext] = useState<string | undefined>(undefined);
  const [predicate, setPredicate] = useState<string | undefined>(undefined);
  const entities = useMemo(() => entitiesFromFacts(facts), [facts]);
  const predicates = useMemo(() => predicatesFromFacts(facts), [facts]);

  return (
    <div {...Util.composableProps(props, { classNames: 'grid grid-rows-[1fr_1fr] gap-2 min-h-0' })} ref={forwardedRef}>
      <FactViewer.Root facts={facts} context={context} predicate={predicate} />
      <div className='grid grid-cols-[1fr_1fr] min-h-0'>
        <EntityList entities={entities} selected={context} onSelect={setContext} />
        <PredicateList predicates={predicates} selected={predicate} onSelect={setPredicate} />
      </div>
    </div>
  );
});

FactPanel.displayName = 'FactPanel';
