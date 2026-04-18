//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { Filter, Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import { useQuery } from '@dxos/react-client/echo';
import { Icon, Panel, Toolbar } from '@dxos/react-ui';

import { PushCard } from '#operations';
import { Trello } from '#types';

export type TrelloCardArticleProps = {
  role: string;
  subject: Trello.TrelloCard;
  attendableId?: string;
};

/**
 * Article view for editing a TrelloCard and pushing changes back to Trello.
 */
export const TrelloCardArticle = ({ role, subject: card }: TrelloCardArticleProps) => {
  const [pushing, setPushing] = useState(false);
  const [pushStatus, setPushStatus] = useState<string | null>(null);
  const { invokePromise } = useOperationInvoker();

  // Find the board that owns this card by matching Trello foreign keys.
  const db = Obj.getDatabase(card);
  const boards: Trello.TrelloBoard[] = useQuery(db, Filter.type(Trello.TrelloBoard));
  const board = useMemo(() => {
    // If there's only one board, use it.
    if (boards.length <= 1) {
      return boards[0];
    }
    // Otherwise, we return the first board with a matching accessToken (all boards are candidates).
    return boards.find((candidate) => candidate.accessToken !== undefined) ?? boards[0];
  }, [boards]);

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
            <a href={card.url} target='_blank' rel='noreferrer'>
              <Toolbar.IconButton label='Open in Trello' icon='ph--arrow-square-out--regular' iconOnly />
            </a>
          )}
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content classNames='p-4 space-y-3'>
        <div>
          <label className='mb-1 block text-xs font-medium text-subdued'>Name</label>
          <input
            type='text'
            value={card.name}
            onChange={(event) => Obj.change(card, (mutable) => { mutable.name = event.target.value; })}
            className='w-full rounded border border-separator bg-transparent px-3 py-2 text-sm'
          />
        </div>

        <div>
          <label className='mb-1 block text-xs font-medium text-subdued'>Description</label>
          <textarea
            value={card.description ?? ''}
            onChange={(event) => Obj.change(card, (mutable) => { mutable.description = event.target.value; })}
            rows={8}
            className='w-full rounded border border-separator bg-transparent px-3 py-2 text-sm'
          />
        </div>

        <div>
          <label className='mb-1 block text-xs font-medium text-subdued'>List</label>
          <p className='text-sm text-description'>{card.listName ?? 'Unknown'}</p>
        </div>

        {card.labels && card.labels.length > 0 && (
          <div>
            <label className='mb-1 block text-xs font-medium text-subdued'>Labels</label>
            <div className='flex gap-1'>
              {card.labels.map((label) => (
                <span
                  key={label.trelloId}
                  className='rounded px-2 py-0.5 text-xs'
                  style={{ backgroundColor: label.color ?? '#ccc', color: '#fff' }}
                >
                  {label.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {card.dueDate && (
          <div>
            <label className='mb-1 block text-xs font-medium text-subdued'>Due Date</label>
            <p className='text-sm text-description'>
              {new Date(card.dueDate).toLocaleDateString()}
              {card.dueComplete && ' (complete)'}
            </p>
          </div>
        )}

        {card.members && card.members.length > 0 && (
          <div>
            <label className='mb-1 block text-xs font-medium text-subdued'>Members</label>
            <p className='text-sm text-description'>
              {card.members.map((member) => member.fullName ?? member.username).join(', ')}
            </p>
          </div>
        )}
      </Panel.Content>
    </Panel.Root>
  );
};
