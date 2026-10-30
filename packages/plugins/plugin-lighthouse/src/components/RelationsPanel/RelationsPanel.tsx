//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Layout from '@dxos/react-ui/Layout';
import * as Typography from '@dxos/react-ui/Typography';

import { type SubjectGraph as SubjectGraphData } from '../../client/types.ts';
import { LighthouseNamespace } from '../../namespace.ts';
import { iconOf, kindOfNode, neighbourhood, neighboursOf, splitCurie } from '../SubjectGraph/model.ts';
import { SubjectGraph } from '../SubjectGraph/SubjectGraph.tsx';

export type RelationsPanelProps = {
  /** The graph around the result; undefined while it loads. */
  graph?: SubjectGraphData;
  /** The result whose relations are shown. */
  iri: string;
  onSelect?: (iri: string) => void;
};

/**
 * A result's relations, for its companion: its 1-hop neighbourhood as a small graph, and the same neighbours as a
 * list grouped by predicate (the list reads where the graph is too small to).
 */
export const RelationsPanel = ({ graph, iri, onSelect }: RelationsPanelProps) => {
  const { t } = Hooks.useTranslation(LighthouseNamespace.key);
  const near = useMemo(() => (graph ? neighbourhood(graph, iri) : undefined), [graph, iri]);
  const groups = useMemo(() => {
    const byPredicate = new Map<string, ReturnType<typeof neighboursOf>>();
    for (const neighbour of graph ? neighboursOf(graph, iri) : []) {
      byPredicate.set(neighbour.edge.predicate, [...(byPredicate.get(neighbour.edge.predicate) ?? []), neighbour]);
    }
    return [...byPredicate.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [graph, iri]);

  if (!graph || !near) {
    return (
      <Layout.Flex gap='sm' align='center' classNames='text-sm text-fg-muted' data-testid='lighthouse.relations'>
        <Icon.Icon icon='ph--circle-notch--regular' classNames='animate-spin' />
        {t('relations-loading.message')}
      </Layout.Flex>
    );
  }

  if (groups.length === 0) {
    return (
      <span className='text-sm text-fg-muted' data-testid='lighthouse.relations'>
        {t('relations-empty.message')}
      </span>
    );
  }

  return (
    <Layout.Flex column gap='sm' data-testid='lighthouse.relations'>
      <div className='h-72 rounded-sm border border-separator'>
        <SubjectGraph graph={near} selectedId={iri} onSelect={onSelect} />
      </div>
      {groups.map(([predicate, neighbours]) => {
        const { prefix, name } = splitCurie(predicate);
        return (
          <Layout.Flex key={predicate} column gap='xs'>
            <Typography.Text classNames='text-xs uppercase tracking-wide'>
              <span className='text-fg-subtle'>{prefix}</span>
              <span className='text-fg-muted'>{name}</span>
              <span className='text-fg-subtle tabular-nums'> {neighbours.length}</span>
            </Typography.Text>
            <Layout.Flex asChild column>
              <ul>
                {neighbours.map(({ node, direction }) => (
                  <li key={`${direction} ${node.id}`}>
                    <Layout.Grid
                      asChild
                      cols={['auto', 'fill', 'auto']}
                      gap='sm'
                      align='center'
                      classNames='w-full py-0.5 text-sm text-start dx-hover rounded-sm cursor-pointer'
                    >
                      <button
                        type='button'
                        onClick={() => onSelect?.(node.id)}
                        data-testid='lighthouse.relations.node'
                        data-iri={node.id}
                      >
                        <Icon.Icon icon={iconOf(node.types)} size='sm' classNames='text-fg-subtle' />
                        <span className='truncate' title={node.label}>
                          {node.label}
                        </span>
                        <span className='text-xs text-fg-subtle whitespace-nowrap'>
                          {direction === 'in' ? '← ' : ''}
                          {kindOfNode(node)}
                        </span>
                      </button>
                    </Layout.Grid>
                  </li>
                ))}
              </ul>
            </Layout.Flex>
          </Layout.Flex>
        );
      })}
    </Layout.Flex>
  );
};
