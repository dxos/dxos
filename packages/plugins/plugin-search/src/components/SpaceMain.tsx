//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { useAppGraph } from '@dxos/app-framework/react';
import { Surface } from '@dxos/app-framework/react';
import { Filter, Obj, Query } from '@dxos/echo';
import { Graph, type Node, useConnections } from '@dxos/plugin-graph';
import { type Space, useQuery } from '@dxos/react-client/echo';
import { useTranslation } from '@dxos/react-ui';
import { SearchList } from '@dxos/react-ui-searchlist';
import { StackItem } from '@dxos/react-ui-stack';
import { Text } from '@dxos/schema';

import { meta } from '../meta';

export const SpaceMain = ({ space }: { space: Space }) => {
  const { t } = useTranslation(meta.id);
  const [query, setQuery] = useState<string>();

  // Get all descendents of the space node for the default view.
  const descendents = useAllDescendents(space.id);

  const handleSearch = useCallback((text: string) => {
    setQuery(text);
  }, []);

  // TODO(dmaretskyi): Switch back to QueryEditor once query builder is ready for production.
  // Query results using full-text search.
  const results = useQuery(
    space.db,
    query === undefined
      ? Query.select(Filter.nothing())
      : Query.all(
          Query.select(Filter.text(query, { type: 'full-text' })).select(Filter.not(Filter.type(Text.Text))),
          Query.select(Filter.text(query, { type: 'full-text' }))
            .select(Filter.type(Text.Text))
            .referencedBy('dxos.org/type/Document', 'content'),
        ),
  );

  // Determine if query is empty (show default view).
  const isQueryEmpty = !query?.trim();

  // Filter descendents to only those which are objects.
  const filteredDescendents = useMemo(() => descendents.filter((node) => Obj.isObject(node.data)), [descendents]);

  return (
    <StackItem.Content>
      <SearchList.Root onSearch={handleSearch} classNames='flex flex-col bs-full overflow-hidden'>
        <SearchList.Input placeholder={t('search placeholder')} classNames='pli-2' />
        <SearchList.Content classNames='overflow-y-auto'>
          <SearchList.Viewport>
            {isQueryEmpty &&
              filteredDescendents.map((node) => (
                <div key={node.id} role='none' className='pli-2 first:pbs-2 pbe-2'>
                  <Surface role='card' data={{ subject: node.data }} limit={1} />
                </div>
              ))}
            {!isQueryEmpty &&
              results
                .filter((obj) => Obj.getLabel(obj))
                .map((obj) => (
                  <div key={obj.id} role='none' className='pli-2 first:pbs-2 pbe-2'>
                    <Surface role='card' data={{ subject: obj }} limit={1} />
                  </div>
                ))}
            {!isQueryEmpty && results.length === 0 && <SearchList.Empty>{t('empty results message')}</SearchList.Empty>}
          </SearchList.Viewport>
        </SearchList.Content>
      </SearchList.Root>
    </StackItem.Content>
  );
};

export default SpaceMain;

/**
 * Hook to collect all descendents of a graph node into a flattened list.
 */
const useAllDescendents = (nodeId?: string): Node.Node[] => {
  const { graph } = useAppGraph();
  const directConnections = useConnections(graph, nodeId, 'outbound');

  return useMemo(() => {
    if (!nodeId) {
      return [];
    }

    const result: Node.Node[] = [];
    const visited = new Set<string>();

    const collectDescendents = (connections: Node.Node[]) => {
      for (const node of connections) {
        // Break cycles.
        if (visited.has(node.id)) {
          continue;
        }
        visited.add(node.id);
        result.push(node);

        // Expand and recursively collect children.
        Graph.expand(graph, node.id, 'outbound');
        const children = Graph.getConnections(graph, node.id, 'outbound');
        collectDescendents(children);
      }
    };

    collectDescendents(directConnections);
    return result;
  }, [nodeId, directConnections, graph]);
};
