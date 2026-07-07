//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Panel, type ThemedClassName, Toolbar } from '@dxos/react-ui';
import { Empty, Listbox } from '@dxos/react-ui-list';

import { type PredicateItem } from '../util';

export type PredicateListProps = ThemedClassName<{
  predicates: PredicateItem[];
}>;

/**
 * Predicate column: the distinct predicates across the facts with occurrence counts, derived from
 * the fact graph. Presentational — mirrors {@link EntityList} but display-only.
 */
export const PredicateList = ({ predicates, classNames }: PredicateListProps) => (
  <Panel.Root classNames={classNames}>
    <Panel.Toolbar asChild>
      <Toolbar.Root>
        <Toolbar.Text>Predicates{predicates.length > 0 ? ` (${predicates.length})` : ''}</Toolbar.Text>
      </Toolbar.Root>
    </Panel.Toolbar>
    <Panel.Content classNames='overflow-auto'>
      {predicates.length === 0 ? (
        <Empty label='No predicates.' />
      ) : (
        <Listbox.Root>
          <Listbox.Content aria-label='Predicates'>
            {predicates.map((item) => (
              <Listbox.Item classNames='gap-2' key={item.predicate} id={item.predicate}>
                <Listbox.ItemLabel>{item.predicate}</Listbox.ItemLabel>
                <span className='shrink-0 text-subdued tabular-nums'>{item.count}</span>
              </Listbox.Item>
            ))}
          </Listbox.Content>
        </Listbox.Root>
      )}
    </Panel.Content>
  </Panel.Root>
);
