//
// Copyright 2025 DXOS.org
//

import React, { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { getTypePath, LayoutOperation } from '@dxos/app-toolkit';
import { Filter, Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import { Kanban } from '@dxos/plugin-kanban/types';
import { useQuery } from '@dxos/react-client/echo';
import { Card, Icon, Panel, ScrollArea, Toolbar } from '@dxos/react-ui';
import { Focus, Mosaic, type MosaicTileProps, useMosaicContainer } from '@dxos/react-ui-mosaic';
import { ViewModel } from '@dxos/schema';

import { SyncBoard } from '#operations';
import { Trello } from '#types';

export type TrelloArticleProps = {
  role: string;
  subject: Trello.TrelloBoard;
  attendableId?: string;
};

//
// Card tile for Mosaic.VirtualStack.
//

type CardTileData = {
  card: Trello.TrelloCard;
};

type CardTileProps = Pick<MosaicTileProps<CardTileData>, 'data' | 'location' | 'current'>;

const CardTile = forwardRef<HTMLDivElement, CardTileProps>(({ data, location, current }, forwardedRef) => {
  const { card } = data;
  const { setCurrentId } = useMosaicContainer('CardTile');
  const cardId = Trello.getTrelloCardId(card) ?? card.id;

  return (
    <Mosaic.Tile asChild classNames='dx-hover dx-current' id={cardId} data={data} location={location}>
      <Focus.Item asChild current={current} onCurrentChange={() => setCurrentId(cardId)}>
        <Card.Root ref={forwardedRef}>
          <Card.Toolbar>
            <Card.IconBlock>
              <Card.Icon icon='ph--note--regular' />
            </Card.IconBlock>
            <Card.Text classNames='truncate'>{card.name}</Card.Text>
            {card.url && (
              <Card.IconBlock>
                <a href={card.url} target='_blank' rel='noreferrer' className='shrink-0'>
                  <Icon icon='ph--arrow-square-out--regular' size={4} />
                </a>
              </Card.IconBlock>
            )}
          </Card.Toolbar>
          <Card.Content>
            {card.listName && (
              <Card.Row icon='ph--columns--regular'>
                <Card.Text variant='description'>{card.listName}</Card.Text>
              </Card.Row>
            )}
            {card.labels && card.labels.length > 0 && (
              <Card.Row icon='ph--tag--regular'>
                <Card.Text variant='description'>
                  {card.labels.map((label) => label.name).join(', ')}
                </Card.Text>
              </Card.Row>
            )}
            {card.dueDate && (
              <Card.Row icon='ph--calendar--regular'>
                <Card.Text variant='description'>
                  Due: {new Date(card.dueDate).toLocaleDateString()}
                </Card.Text>
              </Card.Row>
            )}
            {card.description && (
              <Card.Row>
                <Card.Text variant='description' classNames='line-clamp-2'>
                  {card.description}
                </Card.Text>
              </Card.Row>
            )}
          </Card.Content>
        </Card.Root>
      </Focus.Item>
    </Mosaic.Tile>
  );
});

CardTile.displayName = 'CardTile';

//
// Main article component.
//

export const TrelloArticle = ({ role, subject: board }: TrelloArticleProps) => {
  const db = Obj.getDatabase(board);
  const trelloBoardId = Trello.getTrelloBoardId(board);
  const allCards: Trello.TrelloCard[] = useQuery(db, Filter.type(Trello.TrelloCard));
  const boardCards = useMemo(
    () => allCards.filter((card) => !card.closed && Trello.getTrelloCardId(card) !== undefined),
    [allCards],
  );
  const [syncing, setSyncing] = useState(false);
  const [viewport, setViewport] = useState<HTMLElement | null>(null);
  const { invokePromise } = useOperationInvoker();

  const handleOpenKanban = useCallback(() => {
    if (!board.kanbanId || !db) {
      return;
    }
    const kanbanPath = getTypePath(db.spaceId, 'org.dxos.type.trelloCard', board.kanbanId);
    void invokePromise(LayoutOperation.Open, { subject: [kanbanPath] });
  }, [board.kanbanId, db, invokePromise]);

  const cardItems = useMemo(
    () => boardCards
      .sort((cardA, cardB) => (cardA.position ?? 0) - (cardB.position ?? 0))
      .map((card) => ({ card })),
    [boardCards],
  );

  const handleSync = useCallback(async () => {
    if (!db || !board.accessToken) {
      return;
    }

    setSyncing(true);
    try {
      await invokePromise(SyncBoard, { board: Ref.make(board) });

      // Create Kanban view on first sync if not already created.
      if (!board.kanbanId) {
        try {
          const remoteLists = allCards
            .filter((card) => card.listName)
            .map((card) => card.listName!)
            .filter((name, index, arr) => arr.indexOf(name) === index);

          const { view } = await ViewModel.makeFromDatabase({
            db,
            typename: 'org.dxos.type.trelloCard',
            pivotFieldName: 'listName',
            fields: ['name', 'description', 'listName', 'dueDate'],
            createInitial: 0,
          });

          const kanban = Kanban.make({
            name: board.name ?? 'Trello Board',
            view,
            arrangement: { order: remoteLists, columns: {} },
          });
          db.add(kanban);
          Obj.change(board, (mutable) => { mutable.kanbanId = kanban.id; });
        } catch (kanbanError) {
          log.catch(kanbanError);
        }
      }
    } catch (error) {
      log.catch(error);
    } finally {
      setSyncing(false);
    }
  }, [db, board, allCards, invokePromise]);

  const didAutoSync = useRef(false);
  useEffect(() => {
    if (!didAutoSync.current && board.accessToken && !board.lastSyncedAt) {
      didAutoSync.current = true;
      void handleSync();
    }
  }, [board.accessToken, board.lastSyncedAt, handleSync]);

  return (
    <Panel.Root role={role}>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Toolbar.Text>{board.name ?? 'Trello Board'}</Toolbar.Text>
          <Toolbar.Separator />
          <Toolbar.IconButton
            label={syncing ? 'Syncing...' : 'Sync board'}
            icon='ph--arrows-clockwise--regular'
            iconOnly
            disabled={syncing || !board.accessToken}
            onClick={handleSync}
          />
          {board.kanbanId && (
            <Toolbar.IconButton
              label='View as Kanban'
              icon='ph--kanban--regular'
              iconOnly
              onClick={handleOpenKanban}
            />
          )}
          {board.url && (
            <a href={board.url} target='_blank' rel='noreferrer'>
              <Toolbar.IconButton label='Open in Trello' icon='ph--arrow-square-out--regular' iconOnly />
            </a>
          )}
          {board.lastSyncedAt && (
            <>
              <Toolbar.Separator />
              <Toolbar.Text>{new Date(board.lastSyncedAt).toLocaleTimeString()}</Toolbar.Text>
            </>
          )}
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content asChild>
        <Focus.Group asChild>
          <Mosaic.Container asChild withFocus autoScroll={viewport}>
            <ScrollArea.Root orientation='vertical' padding centered>
              <ScrollArea.Viewport ref={setViewport}>
                <Mosaic.VirtualStack
                  Tile={CardTile}
                  classNames='my-2'
                  gap={8}
                  items={cardItems}
                  draggable={false}
                  getId={(item) => Trello.getTrelloCardId(item.card) ?? item.card.id}
                  getScrollElement={() => viewport}
                  estimateSize={() => 120}
                />
              </ScrollArea.Viewport>
            </ScrollArea.Root>
          </Mosaic.Container>
        </Focus.Group>
      </Panel.Content>
      {!board.accessToken && (
        <Panel.Statusbar>
          <p className='flex p-1 items-center text-warning-text'>Configure an AccessToken in board properties to enable sync.</p>
        </Panel.Statusbar>
      )}
    </Panel.Root>
  );
};
