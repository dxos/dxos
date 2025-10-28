//
// Copyright 2025 DXOS.org
//

import { Rx, useRxValue } from '@effect-rx/rx-react';
import React, { useCallback, useEffect, useMemo } from 'react';

import { LayoutAction, createIntent, useAppGraph, useIntentDispatcher } from '@dxos/app-framework';
import { type Node, ROOT_ID, useConnections } from '@dxos/plugin-graph';
import { Avatar, Icon, Main, Tooltip, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { DropdownMenu, MenuProvider } from '@dxos/react-ui-menu';
import { Card } from '@dxos/react-ui-stack';

import { meta } from '../meta';

const grid = 'grid grid-cols-[1fr_auto] min-bs-[2.5rem]';

export const Home = () => {
  const { graph } = useAppGraph();
  const workspaces = useWorkspaces();

  useLoadDescendents(graph.root);

  return (
    <Main.Content bounce>
      <Header />
      <section className='container-max-width pli-cardSpacingInline plb-cardSpacingChrome'>
        {workspaces.map((node) => (
          <Workspace key={node.id} node={node} />
        ))}
      </section>
    </Main.Content>
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

  const name = toLocalizedString(node.properties.label, t);

  return (
    <Card.StaticRoot role='button' tabIndex={0} classNames='dx-focus-ring' onClick={handleClick}>
      <Card.Chrome classNames='grid grid-cols-[min-content_1fr_min-content] items-center gap-cardSpacingInline pie-cardSpacingInline'>
        <Avatar.Root>
          <Avatar.Content
            hue={node.properties.hue}
            icon={node.properties.icon}
            hueVariant='surface'
            variant='square'
            size={12}
            fallback={name}
          />
          <Avatar.Label>{name}</Avatar.Label>
          <Icon icon='ph--caret-right--regular' />
        </Avatar.Root>
      </Card.Chrome>
    </Card.StaticRoot>
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
