//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useEffect, useMemo } from 'react';

import { Common } from '@dxos/app-framework';
import { useAppGraph, useOperationInvoker } from '@dxos/app-framework/react';
import { Graph, Node, useConnections } from '@dxos/plugin-graph';
import { Avatar, Icon, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { Card } from '@dxos/react-ui-mosaic';

import { meta } from '../meta';

import { bannerHeading, bannerRoot } from './Banner';

export const Home = () => {
  const { t } = useTranslation(meta.id);
  const { graph } = useAppGraph();
  const workspaces = useWorkspaces();

  useLoadDescendents(Node.RootId);

  return (
    <>
      <Header />
      <Card.Heading classNames='container-max-width'>{t('workspaces heading')}</Card.Heading>
      <section className='container-max-width pli-cardSpacingInline mbe-8 space-y-cardSpacingBlock'>
        {workspaces.map((node) => (
          <Workspace key={node.id} node={node} />
        ))}
      </section>
    </>
  );
};

const Header = () => {
  const { t } = useTranslation(meta.id);

  return (
    <nav className={bannerRoot}>
      <h1 className={bannerHeading}>{t('current app name', { ns: 'appkit' })}</h1>
    </nav>
  );
};

const Workspace = ({ node }: { node: Node.Node }) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();

  const handleClick = useCallback(
    () => invokePromise(Common.LayoutOperation.SwitchWorkspace, { subject: node.id }),
    [invokePromise, node.id],
  );

  useLoadDescendents(node.id);

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

const useLoadDescendents = (nodeId?: string) => {
  const { graph } = useAppGraph();

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (nodeId) {
        Graph.expand(graph, nodeId, 'outbound');
        Graph.getConnections(graph, nodeId, 'outbound').forEach((child) => {
          Graph.expand(graph, child.id, 'outbound');
        });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [nodeId, graph]);
};

const useWorkspaces = () => {
  const { graph } = useAppGraph();

  // Get root connections to find collections.
  const rootConnections = useConnections(graph, Node.RootId);
  const collections = useMemo(
    () => rootConnections.filter((node) => node.properties.disposition === 'collection'),
    [rootConnections],
  );

  // Get first collection's children as workspaces.
  // TODO(wittjosiah): Support multiple collections or nested workspaces if needed.
  const firstCollection = collections[0];
  const workspaces = useConnections(graph, firstCollection?.id);

  return workspaces;
};
