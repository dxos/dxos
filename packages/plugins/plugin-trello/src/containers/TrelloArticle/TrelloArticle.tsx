//
// Copyright 2025 DXOS.org
//

import React, { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { getTypePath, LayoutOperation } from '@dxos/app-toolkit';
import { Filter, Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { Kanban } from '@dxos/plugin-kanban/types';
import { useQuery } from '@dxos/react-client/echo';
import { Card, Icon, Panel, ScrollArea, Tag, Toolbar } from '@dxos/react-ui';
import { Focus, Mosaic, type MosaicTileProps, useMosaicContainer } from '@dxos/react-ui-mosaic';
import { ViewModel } from '@dxos/schema';

import { Trello } from '#types';

export type TrelloArticleProps = {
  role: string;
  subject: Trello.TrelloBoard;
  attendableId?: string;
};

const TRELLO_API_BASE = 'https://api.trello.com/1';

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

  return (
    <Mosaic.Tile asChild classNames='dx-hover dx-current' id={card.trelloCardId} data={data} location={location}>
      <Focus.Item asChild current={current} onCurrentChange={() => setCurrentId(card.trelloCardId)}>
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
  const allCards: Trello.TrelloCard[] = useQuery(db, Filter.type(Trello.TrelloCard));
  const boardCards = allCards.filter((card) => !card.closed && card.trelloBoardId === board.trelloBoardId);
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
    if (!db || !board.apiKey || !board.apiToken) {
      return;
    }

    setSyncing(true);
    try {
      const auth = `key=${board.apiKey}&token=${board.apiToken}`;
      const [boardRes, listsRes, cardsRes] = await Promise.all([
        fetch(`${TRELLO_API_BASE}/boards/${board.trelloBoardId}?${auth}`),
        fetch(`${TRELLO_API_BASE}/boards/${board.trelloBoardId}/lists?filter=open&${auth}`),
        fetch(`${TRELLO_API_BASE}/boards/${board.trelloBoardId}/cards?members=true&filter=open&${auth}`),
      ]);

      const [boardInfo, remoteLists, remoteCards] = await Promise.all([
        boardRes.json(),
        listsRes.json(),
        cardsRes.json(),
      ]);

      const listNameById = new Map<string, string>(remoteLists.map((list: any) => [list.id, list.name]));

      Obj.change(board, (mutable) => {
        mutable.name = boardInfo.name;
        mutable.url = boardInfo.url;
        mutable.closed = boardInfo.closed;
      });

      const ownedCards = allCards.filter((card) => card.trelloBoardId === board.trelloBoardId || !card.trelloBoardId);
      const existingByTrelloId = new Map(ownedCards.map((card) => [card.trelloCardId, card]));

      for (const remote of remoteCards) {
        const listName = listNameById.get(remote.idList);
        const labels = remote.labels?.map((label: any) => ({
          trelloId: label.id,
          name: label.name,
          color: label.color ?? undefined,
        }));
        const members = remote.members?.map((member: any) => ({
          trelloId: member.id,
          fullName: member.fullName,
          username: member.username,
          avatarUrl: member.avatarUrl ?? undefined,
        }));

        const existing = existingByTrelloId.get(remote.id);
        if (existing) {
          Obj.change(existing, (mutable) => {
            mutable.name = remote.name;
            mutable.description = remote.desc;
            mutable.trelloBoardId = board.trelloBoardId;
            mutable.trelloListId = remote.idList;
            mutable.listName = listName;
            mutable.position = remote.pos;
            mutable.dueDate = remote.due ?? undefined;
            mutable.dueComplete = remote.dueComplete;
            mutable.labels = labels;
            mutable.members = members;
            mutable.url = remote.url;
            mutable.closed = remote.closed;
            mutable.lastActivityAt = remote.dateLastActivity;
          });
        } else {
          db.add(Trello.makeCard({
            name: remote.name,
            description: remote.desc,
            trelloCardId: remote.id,
            trelloBoardId: board.trelloBoardId,
            trelloListId: remote.idList,
            listName,
            position: remote.pos,
            dueDate: remote.due ?? undefined,
            dueComplete: remote.dueComplete,
            labels,
            members,
            url: remote.url,
            closed: remote.closed,
            lastActivityAt: remote.dateLastActivity,
          }));
        }
      }

      const remoteIds = new Set(remoteCards.map((rc: any) => rc.id));
      for (const [trelloId, existing] of existingByTrelloId) {
        if (!remoteIds.has(trelloId)) {
          Obj.change(existing, (mutable) => { mutable.closed = true; });
        }
      }

      Obj.change(board, (mutable) => { mutable.lastSyncedAt = new Date().toISOString(); });

      if (!board.kanbanId && db) {
        try {
          const { view } = await ViewModel.makeFromDatabase({
            db,
            typename: 'org.dxos.type.trelloCard',
            pivotFieldName: 'listName',
            fields: ['name', 'description', 'listName', 'dueDate'],
            createInitial: 0,
          });
          const listOrder = remoteLists.map((list: any) => list.name as string);
          const kanban = Kanban.make({
            name: boardInfo.name,
            view,
            arrangement: { order: listOrder, columns: {} },
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
  }, [db, board, boardCards]);

  const didAutoSync = useRef(false);
  useEffect(() => {
    if (!didAutoSync.current && board.apiKey && board.apiToken && !board.lastSyncedAt) {
      didAutoSync.current = true;
      void handleSync();
    }
  }, [board.apiKey, board.apiToken, board.lastSyncedAt, handleSync]);

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
            disabled={syncing || !board.apiKey || !board.apiToken}
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
                  getId={(item) => item.card.trelloCardId}
                  getScrollElement={() => viewport}
                  estimateSize={() => 120}
                />
              </ScrollArea.Viewport>
            </ScrollArea.Root>
          </Mosaic.Container>
        </Focus.Group>
      </Panel.Content>
      {(!board.apiKey || !board.apiToken) && (
        <Panel.Statusbar>
          <p className='flex p-1 items-center text-warning-text'>Configure API Key and Token in board properties to enable sync.</p>
        </Panel.Statusbar>
      )}
    </Panel.Root>
  );
};
