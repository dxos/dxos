//
// Copyright 2025 DXOS.org
//

import { Rx, useRxValue } from '@effect-rx/rx-react';
import React, { useCallback, useEffect, useMemo } from 'react';

import { LayoutAction, createIntent, useAppGraph, useIntentDispatcher } from '@dxos/app-framework';
import { type Node, ROOT_ID, isGraphNode, useConnections } from '@dxos/plugin-graph';
import { Icon, Tooltip, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { List } from '@dxos/react-ui-list';
import { DropdownMenu, MenuProvider } from '@dxos/react-ui-menu';
import { mx } from '@dxos/react-ui-theme';

import { meta } from '../meta';

const grid = 'grid grid-cols-[1fr_auto] min-bs-[2.5rem]';

export const Home = () => {
  const { graph } = useAppGraph();
  const workspaces = useWorkspaces();

  useLoadDescendents(graph.root);

  return (
    <>
      <Header />
      <List.Root<Node> items={workspaces} isItem={isGraphNode} getId={(node) => node.id}>
        {({ items }) => (
          <div role='list' className='flex flex-col w-full'>
            {items?.map((node) => (
              <Workspace key={node.id} node={node} />
            ))}
          </div>
        )}
      </List.Root>
    </>
  );
};

const Header = () => {
  const { t } = useTranslation(meta.id);
  const { graph } = useAppGraph();

  const connections = useConnections(graph, ROOT_ID);
  const menuActions = connections.filter((node) => node.properties.disposition === 'menu');

  return (
    <div>
      <MenuProvider>
        <DropdownMenu.Root group={graph.root} items={menuActions}>
          <Tooltip.Trigger content={t('app menu label')} side='right' asChild>
            <DropdownMenu.Trigger
              data-testid='spacePlugin.addSpace'
              className='grid place-items-center dx-focus-ring-group'
            >
              <Icon icon='ph--list--regular' size={5} />
            </DropdownMenu.Trigger>
          </Tooltip.Trigger>
        </DropdownMenu.Root>
      </MenuProvider>
    </div>
  );
};

const Workspace = ({ node }: { node: Node }) => {
  const { t } = useTranslation(meta.id);
  const { dispatchPromise: dispatch } = useIntentDispatcher();

  const handleClick = useCallback(
    () => dispatch(createIntent(LayoutAction.SwitchWorkspace, { part: 'workspace', subject: node.id })),
    [dispatch],
  );

  useLoadDescendents(node);

  return (
    <List.Item<Node> item={node} classNames={mx(grid, 'items-center', 'pli-2', 'min-bs-[3rem]')} onClick={handleClick}>
      <div className='flex flex-col truncate'>
        <List.ItemTitle classNames='truncate'>{toLocalizedString(node.properties.label, t)}</List.ItemTitle>
      </div>
    </List.Item>
  );
};

const useLoadDescendents = (node?: Node) => {
  const { graph } = useAppGraph();

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (node) {
        graph.expand(node.id, 'outbound');
        graph.getConnections(node.id, 'outbound').forEach((child) => {
          graph.expand(child.id, 'outbound');
        });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [node]);
};

const useWorkspaces = () => {
  const { graph } = useAppGraph();

  const workspaces = useMemo(
    () =>
      Rx.make((get) => {
        const nodes = get(graph.connections(ROOT_ID));
        return nodes
          .filter((node) => node.properties.disposition === 'collection')
          .flatMap((node) => get(graph.connections(node.id)));
      }),
    [graph],
  );

  return useRxValue(workspaces);
};
