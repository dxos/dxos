//
// Copyright 2025 DXOS.org
//

import { Rx, useRxValue } from '@effect-rx/rx-react';
import React, { useCallback, useEffect, useMemo } from 'react';

import { LayoutAction, createIntent, useAppGraph, useIntentDispatcher } from '@dxos/app-framework';
import { type Node, ROOT_ID, useConnections } from '@dxos/plugin-graph';
import { Avatar, Icon, IconButton, Tooltip, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { DropdownMenu, MenuProvider } from '@dxos/react-ui-menu';
import { Card } from '@dxos/react-ui-stack';

import { meta } from '../meta';

import { navHeaderButton, navHeaderHeading, navHeaderRoot } from './NavHeader';

const subheading = 'container-max-width pli-cardSpacingInline mlb-cardSpacingBlock text-lg';

export const Home = () => {
  const { t } = useTranslation(meta.id);
  const { graph } = useAppGraph();
  const workspaces = useWorkspaces();

  useLoadDescendents(graph.root);

  return (
    <>
      <Header />
      <Card.Heading classNames='container-max-width'>{t('workspaces heading')}</Card.Heading>
      <section className='container-max-width pli-cardSpacingInline mbe-8'>
        {workspaces.map((node) => (
          <Workspace key={node.id} node={node} />
        ))}
      </section>
      <Card.Heading classNames='container-max-width'>{t('settings heading')}</Card.Heading>
      <p className='pli-cardSpacingInline'>To do.</p>
    </>
  );
};

const Header = () => {
  const { t } = useTranslation(meta.id);
  const { graph } = useAppGraph();

  const connections = useConnections(graph, ROOT_ID);
  const menuActions = connections.filter((node) => node.properties.disposition === 'menu');

  return (
    <nav className={navHeaderRoot}>
      <MenuProvider>
        <DropdownMenu.Root group={graph.root} items={menuActions}>
          <Tooltip.Trigger content={t('app menu label')} side='right' asChild>
            <DropdownMenu.Trigger data-testid='spacePlugin.addSpace' asChild>
              <IconButton
                iconOnly
                variant='ghost'
                icon='ph--list--regular'
                label={t('main menu label')}
                classNames={navHeaderButton}
              />
            </DropdownMenu.Trigger>
          </Tooltip.Trigger>
        </DropdownMenu.Root>
      </MenuProvider>
      <h1 className={navHeaderHeading}>{t('current app name', { ns: 'appkit' })}</h1>
    </nav>
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
