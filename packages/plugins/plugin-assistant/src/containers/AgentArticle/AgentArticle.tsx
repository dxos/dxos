//
// Copyright 2026 DXOS.org
//

import { Atom, useAtomValue } from '@effect-atom/atom-react';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';
import React, { forwardRef, useMemo, useState } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { useObjectMenuItems, type AppSurface } from '@dxos/app-toolkit/ui';
import { type Agent } from '@dxos/assistant-toolkit';
import { Annotation, Filter, Obj, Query } from '@dxos/echo';
import { AtomObj, AtomRef } from '@dxos/echo-atom';
import { useQuery } from '@dxos/react-client/echo';
import { Card, Input, Message, Panel, ScrollArea, Toolbar, useTranslation } from '@dxos/react-ui';
import { Masonry } from '@dxos/react-ui-masonry';
import { Menu } from '@dxos/react-ui-menu';
import { Focus, Mosaic, type MosaicTileProps } from '@dxos/react-ui-mosaic';
import { composable } from '@dxos/ui-theme';
import { isNonNullable } from '@dxos/util';

import { meta } from '#meta';

export type AgentArticleProps = AppSurface.ObjectArticleProps<Agent.Agent>;

export const AgentArticle = ({ role, subject: agent }: AgentArticleProps) => {
  const { t } = useTranslation(meta.id);
  const [viewport, setViewport] = useState<HTMLElement | null>(null);

  const inputQueue = useAtomValue(
    AtomObj.make(agent).pipe((_) =>
      Atom.make((get) =>
        Option.fromNullable(get(_).queue).pipe(Option.map(AtomRef.make), Option.map(get), Option.getOrUndefined),
      ),
    ),
  );

  const inputQueueObjects = useQuery(inputQueue, Query.select(Filter.everything()));

  const artifacts = useAtomValue(
    useMemo(
      () =>
        AtomObj.make(agent).pipe((agent) =>
          Atom.make((get) => {
            return get(agent)
              .artifacts.map((artifact) => get(AtomRef.make(artifact.data)))
              .filter(isNonNullable);
          }),
        ),
      [agent],
    ),
  );

  return (
    <Panel.Root role={role}>
      <Panel.Toolbar asChild>
        <Toolbar.Root />
      </Panel.Toolbar>
      <Panel.Content className='dx-container flex flex-col'>
        {artifacts.length === 0 && (
          <Message.Root classNames='m-2' valence='info'>
            <Message.Title>{t('project-empty-spec.message')}</Message.Title>
            <Message.Content>{t('project-empty-spec.description')}</Message.Content>
          </Message.Root>
        )}

        {/* TODO(burdon): Add popovers for documentation. */}
        <div role='none' className='dx-container grid grid-cols-2 gap-2 px-2'>
          <div role='none' className='dx-container flex flex-col'>
            <Input.Root>
              <Input.Label>{t('artifacts.label')}</Input.Label>
            </Input.Root>
            <Masonry.Root Tile={MasonryArtifactTile}>
              <Masonry.Content items={artifacts} getId={(item: Obj.Unknown) => item.id} />
            </Masonry.Root>
          </div>
          <div role='none' className='dx-container flex flex-col'>
            <Input.Root>
              <Input.Label>{t('input-queue.label')}</Input.Label>
            </Input.Root>
            <Mosaic.Container asChild withFocus autoScroll={viewport}>
              <ScrollArea.Root orientation='vertical' padding>
                <ScrollArea.Viewport ref={setViewport}>
                  <Mosaic.VirtualStack
                    Tile={StackTile}
                    classNames='gap-2'
                    draggable={false}
                    estimateSize={() => 160}
                    gap={8}
                    getId={(item: Obj.Unknown) => item.id}
                    getScrollElement={() => viewport}
                    items={inputQueueObjects}
                  />
                </ScrollArea.Viewport>
              </ScrollArea.Root>
            </Mosaic.Container>
          </div>
        </div>
      </Panel.Content>
    </Panel.Root>
  );
};

const ArtifactTileCard = composable<HTMLDivElement, { data: Obj.Unknown }>(({ data, ...props }, forwardedRef) => {
  const objectMenuItems = useObjectMenuItems(data);
  const icon = Function.pipe(
    Obj.getSchema(data),
    Option.fromNullable,
    Option.flatMap(Annotation.IconAnnotation.get),
    Option.map(({ icon }) => icon),
    Option.getOrElse(() => 'ph--placeholder--regular'),
  );

  return (
    <Card.Root {...props} ref={forwardedRef} data-testid='board-item' fullWidth>
      <Card.Toolbar>
        <Card.IconBlock padding>
          <Card.Icon icon={icon} />
        </Card.IconBlock>
        <Card.Title>{Obj.getLabel(data)}</Card.Title>
        {/* TODO(wittjosiah): Reconcile with Card.Menu. */}
        <Card.IconBlock padding>
          <Menu.Trigger asChild disabled={!objectMenuItems?.length}>
            <Toolbar.IconButton iconOnly variant='ghost' icon='ph--dots-three-vertical--regular' label='Actions' />
          </Menu.Trigger>
          <Menu.Content items={objectMenuItems} />
        </Card.IconBlock>
      </Card.Toolbar>
      <Card.Content>
        <Surface.Surface role='card--content' limit={1} data={{ subject: data } satisfies AppSurface.ObjectCardData} />
      </Card.Content>
    </Card.Root>
  );
});

ArtifactTileCard.displayName = 'ArtifactTileCard';

const MasonryArtifactTile = ({ data }: { data: Obj.Unknown; index: number }) => (
  <Menu.Root>
    <ArtifactTileCard data={data} />
  </Menu.Root>
);

const StackTile = forwardRef<HTMLDivElement, MosaicTileProps<Obj.Unknown>>(
  ({ data, location, debug }, forwardedRef) => (
    <Menu.Root>
      <Mosaic.Tile asChild id={data.id} data={data} location={location} debug={debug}>
        <Focus.Item asChild>
          <ArtifactTileCard ref={forwardedRef} data={data} />
        </Focus.Item>
      </Mosaic.Tile>
    </Menu.Root>
  ),
);

StackTile.displayName = 'StackTile';
