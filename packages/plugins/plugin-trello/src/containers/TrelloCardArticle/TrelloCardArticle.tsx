//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { Filter, Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import { useQuery } from '@dxos/react-client/echo';
import { Icon, Input, Panel, Tag, Toolbar } from '@dxos/react-ui';

import { PushCard } from '#operations';
import { Trello } from '#types';

export type TrelloCardArticleProps = {
  role: string;
  subject: Trello.TrelloCard;
  attendableId?: string;
};

/**
 * Article view for editing a TrelloCard and pushing changes back to Trello.
 * Uses Composer UI primitives exclusively — no custom DOM elements.
 */
export const TrelloCardArticle = ({ role, subject: card }: TrelloCardArticleProps) => {
  const [pushing, setPushing] = useState(false);
  const [pushStatus, setPushStatus] = useState<string | null>(null);
  const { invokePromise } = useOperationInvoker();

  const db = Obj.getDatabase(card);
  const boards: Trello.TrelloBoard[] = useQuery(db, Filter.type(Trello.TrelloBoard));
  const board = useMemo(() => {
    // Prefer the board the card explicitly references.
    if (card.board?.target) {
      return card.board.target;
    }
    if (boards.length <= 1) {
      return boards[0];
    }
    // Older cards without a back-reference: match on list-id membership. The
    // card's trelloListId only belongs to one board, so whichever board has
    // this card's list as one of its lists is the right owner. We can't know
    // a board's lists locally (they aren't synced as objects), so as a last
    // resort pick the first board that has credentials; never just boards[0]
    // which can be the wrong workspace.
    return boards.find((candidate) => candidate.accessToken !== undefined) ?? boards[0];
  }, [card.board, boards]);

  const handlePush = useCallback(async () => {
    if (!board?.accessToken) {
      setPushStatus('No API credentials found');
      return;
    }

    setPushing(true);
    setPushStatus(null);
    try {
      await invokePromise(PushCard, {
        board: Ref.make(board),
        card: Ref.make(card),
      });
      setPushStatus('Pushed to Trello');
      setTimeout(() => setPushStatus(null), 3000);
    } catch (error) {
      log.catch(error);
      setPushStatus('Failed to push');
    } finally {
      setPushing(false);
    }
  }, [board, card, invokePromise]);

  return (
    <Panel.Root role={role}>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Toolbar.Text classNames='truncate'>{card.name}</Toolbar.Text>
          <Toolbar.Separator />
          <Toolbar.IconButton
            label={pushing ? 'Pushing...' : 'Push to Trello'}
            icon='ph--cloud-arrow-up--regular'
            iconOnly
            disabled={pushing || !board?.accessToken}
            onClick={handlePush}
          />
          {pushStatus && <Toolbar.Text>{pushStatus}</Toolbar.Text>}
          {card.url && (
            <Toolbar.Link href={card.url} target='_blank' rel='noreferrer' aria-label='Open in Trello'>
              <Icon icon='ph--arrow-square-out--regular' size={4} />
            </Toolbar.Link>
          )}
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content classNames='p-4 space-y-4'>
        <Input.Root>
          <Input.Label>Name</Input.Label>
          <Input.TextInput
            value={card.name}
            onChange={(event) =>
              Obj.change(card, (mutable) => {
                mutable.name = event.target.value;
              })
            }
          />
        </Input.Root>

        <Input.Root>
          <Input.Label>Description</Input.Label>
          <Input.TextArea
            value={card.description ?? ''}
            rows={8}
            onChange={(event) =>
              Obj.change(card, (mutable) => {
                mutable.description = event.target.value;
              })
            }
          />
        </Input.Root>

        <Input.Root>
          <Input.Label>List</Input.Label>
          <Input.Description>{card.listName ?? 'Unknown'}</Input.Description>
        </Input.Root>

        {card.labels && card.labels.length > 0 && (
          <Input.Root>
            <Input.Label>Labels</Input.Label>
            <Input.Description>
              {card.labels.map((label) => (
                <Tag key={label.trelloId ?? label.name} palette={label.color as any ?? 'neutral'}>
                  {label.name}
                </Tag>
              ))}
            </Input.Description>
          </Input.Root>
        )}

        {card.dueDate && (
          <Input.Root>
            <Input.Label>Due Date</Input.Label>
            <Input.Description>
              {new Date(card.dueDate).toLocaleDateString()}
              {card.dueComplete && ' (complete)'}
            </Input.Description>
          </Input.Root>
        )}

        {card.members && card.members.length > 0 && (
          <Input.Root>
            <Input.Label>Members</Input.Label>
            <Input.Description>
              {card.members.map((member) => member.fullName ?? member.username).join(', ')}
            </Input.Description>
          </Input.Root>
        )}
      </Panel.Content>
    </Panel.Root>
  );
};
