//
// Copyright 2026 DXOS.org
//

import { Atom, useAtomValue } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import React, { forwardRef, useCallback, useMemo, useRef, useState } from 'react';

import { Surface, useSpaceCallback } from '@dxos/app-framework/ui';
import { AppSurface, useObjectMenuItems } from '@dxos/app-toolkit/ui';
import { Agent } from '@dxos/assistant-toolkit';
import { Database, Feed, Filter, Obj, Query, Ref } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { Card, Icon, IconButton, Message, Panel, ScrollArea, Toolbar, useTranslation } from '@dxos/react-ui';
import { composable } from '@dxos/react-ui';
import { Masonry } from '@dxos/react-ui-masonry';
import { Menu } from '@dxos/react-ui-menu';
import { Focus, Mosaic, type MosaicTileProps } from '@dxos/react-ui-mosaic';
import { isNonNullable } from '@dxos/util';

import { meta } from '#meta';

type Tab = 'artifacts' | 'inputs';

export type AgentArticleProps = AppSurface.ObjectArticleProps<Agent.Agent>;

export const AgentArticle = ({ role, subject: agent }: AgentArticleProps) => {
  const { t } = useTranslation(meta.profile.key);
  const [tab, setTab] = useState<Tab>('artifacts');
  const [viewport, setViewport] = useState<HTMLElement | null>(null);

  const spaceId = Obj.getDatabase(agent)?.spaceId;
  // TODO(burdon): Clear input feed also.
  const resetHistory = useSpaceCallback(
    spaceId,
    [Database.Service],
    Effect.fnUntraced(function* () {
      yield* Agent.resetChatHistory(agent);
      if (!agent.feed) {
        const feed = yield* Database.add(Feed.make());
        Obj.update(agent, (agent) => {
          agent.feed = Ref.make(feed);
        });
      }
    }),
    [agent],
  );
  const handleResetHistory = useCallback(async () => {
    await resetHistory();
  }, [resetHistory]);

  const artifacts = useAtomValue(
    useMemo(
      () =>
        Obj.atom(agent).pipe((agent) =>
          Atom.make((get) => {
            return get(agent)
              .artifacts.map((artifact) => get(artifact.data.atom))
              .filter(isNonNullable);
          }),
        ),
      [agent],
    ),
  );

  const inputFeed = useAtomValue(
    Obj.atom(agent).pipe((_) =>
      Atom.make((get) =>
        Option.fromNullable(get(_).feed).pipe(
          Option.map((ref) => ref.atom),
          Option.map(get),
          Option.getOrUndefined,
        ),
      ),
    ),
  );

  const db = Obj.getDatabase(agent);
  const inputObjects = useQuery(
    db,
    inputFeed ? Query.select(Filter.everything()).from(inputFeed) : Query.select(Filter.nothing()),
  );

  return (
    <Panel.Root role={role}>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Toolbar.ToggleGroup type='single' value={tab} onValueChange={(value) => value && setTab(value as Tab)}>
            <Toolbar.ToggleGroupIconItem value='artifacts' label={t('artifacts.label')} icon='ph--cube--regular' />
            <Toolbar.ToggleGroupIconItem value='inputs' label={t('inputs.label')} icon='ph--queue--regular' />
          </Toolbar.ToggleGroup>
          <Toolbar.Separator />
          <Toolbar.IconButton
            icon='ph--trash--regular'
            label={t('reset-history.button')}
            onCanPlay={handleResetHistory}
          />
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content className='dx-container flex flex-col'>
        {tab === 'artifacts' && (
          <>
            {artifacts.length === 0 && (
              <Message.Root classNames='m-2' valence='info'>
                <Message.Title>{t('project-empty-spec.message')}</Message.Title>
                <Message.Content>{t('project-empty-spec.description')}</Message.Content>
              </Message.Root>
            )}

            <Masonry.Root Tile={MasonryArtifactTile}>
              <Masonry.Content padding thin centered>
                <Masonry.Viewport items={artifacts} getId={(item: Obj.Unknown) => item.id} />
              </Masonry.Content>
            </Masonry.Root>
          </>
        )}

        {tab === 'inputs' && (
          <Mosaic.Container asChild withFocus autoScroll={viewport} classNames='dx-document'>
            <ScrollArea.Root orientation='vertical' padding thin centered>
              <ScrollArea.Viewport ref={setViewport}>
                <Mosaic.VirtualStack
                  Tile={StackTile}
                  classNames='gap-2'
                  draggable={false}
                  estimateSize={() => 160}
                  gap={8}
                  getId={(item: Obj.Unknown) => item.id}
                  getScrollElement={() => viewport}
                  items={inputObjects}
                />
              </ScrollArea.Viewport>
            </ScrollArea.Root>
          </Mosaic.Container>
        )}
      </Panel.Content>
    </Panel.Root>
  );
};

const ArtifactTileCard = composable<HTMLDivElement, { data: Obj.Unknown }>(({ data, ...props }, forwardedRef) => {
  // Card.Root already takes the forwarded ref; walk from the header to resolve the origin plank.
  const cardRef = useRef<HTMLDivElement>(null);
  const objectMenuItems = useObjectMenuItems(data, cardRef);
  const icon = Obj.getIcon(data)?.icon ?? 'ph--circle-dashed--regular';

  return (
    <Card.Root {...props} ref={forwardedRef} data-testid='board-item' fullWidth>
      <Card.Header ref={cardRef}>
        <Card.Block>
          <Icon icon={icon} />
        </Card.Block>
        <Card.Title>{Obj.getLabel(data, { fallback: 'typename' })}</Card.Title>
        {/* TODO(wittjosiah): Reconcile with Card.Menu. */}
        <Card.Block end>
          <Menu.Trigger asChild disabled={!objectMenuItems?.length}>
            <IconButton iconOnly variant='ghost' icon='ph--dots-three-vertical--regular' label='Actions' />
          </Menu.Trigger>
          <Menu.Content items={objectMenuItems} />
        </Card.Block>
      </Card.Header>
      <Card.Body>
        <Surface.Surface
          type={AppSurface.CardContent}
          limit={1}
          data={{ subject: data } satisfies AppSurface.ObjectCardData}
        />
      </Card.Body>
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
  ({ data, location, debug, current }, forwardedRef) => (
    <Menu.Root>
      <Mosaic.Tile asChild id={data.id} data={data} location={location} debug={debug}>
        <Focus.Item asChild current={current}>
          <ArtifactTileCard ref={forwardedRef} data={data} />
        </Focus.Item>
      </Mosaic.Tile>
    </Menu.Root>
  ),
);

StackTile.displayName = 'StackTile';

AgentArticle.displayName = 'AgentArticle';
