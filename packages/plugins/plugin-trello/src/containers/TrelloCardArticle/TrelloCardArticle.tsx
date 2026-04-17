//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { useQuery } from '@dxos/react-client/echo';
import { Filter } from '@dxos/echo';

import { Trello } from '#types';

export type TrelloCardArticleProps = {
  role: string;
  subject: Trello.TrelloCard;
  attendableId?: string;
};

const TRELLO_API_BASE = 'https://api.trello.com/1';

/**
 * Article view for editing a TrelloCard and pushing changes back to Trello.
 */
export const TrelloCardArticle = ({ subject: card }: TrelloCardArticleProps) => {
  const [pushing, setPushing] = useState(false);
  const [pushStatus, setPushStatus] = useState<string | null>(null);

  // Find the board that owns this card (to get API credentials).
  const db = Obj.getDatabase(card);
  const boards: Trello.TrelloBoard[] = useQuery(db, Filter.type(Trello.TrelloBoard));
  const board = boards[0];

  const handlePush = useCallback(async () => {
    if (!board?.apiKey || !board?.apiToken) {
      setPushStatus('No API credentials found');
      return;
    }

    setPushing(true);
    setPushStatus(null);
    try {
      const auth = `key=${board.apiKey}&token=${board.apiToken}`;
      const fields = new URLSearchParams();
      fields.set('name', card.name);
      if (card.description !== undefined) {
        fields.set('desc', card.description ?? '');
      }
      if (card.trelloListId) {
        fields.set('idList', card.trelloListId);
      }

      const response = await fetch(
        `${TRELLO_API_BASE}/cards/${card.trelloCardId}?${auth}`,
        { method: 'PUT', body: fields },
      );

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Trello API error: ${response.status} ${text}`);
      }

      setPushStatus('Pushed to Trello');
      setTimeout(() => setPushStatus(null), 3000);
    } catch (error) {
      log.catch(error);
      setPushStatus('Failed to push');
    } finally {
      setPushing(false);
    }
  }, [board, card]);

  return (
    <div className='flex flex-col gap-4 p-4'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          {card.labels && card.labels.length > 0 && (
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
          )}
        </div>
        <div className='flex items-center gap-2 text-sm'>
          <button
            onClick={handlePush}
            disabled={pushing || !board?.apiKey}
            className='rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-700 disabled:opacity-50'
          >
            {pushing ? 'Pushing...' : 'Push to Trello'}
          </button>
          {pushStatus && (
            <span className='text-neutral-500'>{pushStatus}</span>
          )}
          {card.url && (
            <a href={card.url} target='_blank' rel='noopener noreferrer' className='text-blue-500 hover:underline'>
              Open in Trello
            </a>
          )}
        </div>
      </div>

      <div className='flex flex-col gap-3'>
        <div>
          <label className='mb-1 block text-xs font-medium text-neutral-500'>Name</label>
          <input
            type='text'
            value={card.name}
            onChange={(event) => Obj.change(card, (mutable) => { mutable.name = event.target.value; })}
            className='w-full rounded border border-neutral-600 bg-transparent px-3 py-2 text-sm'
          />
        </div>

        <div>
          <label className='mb-1 block text-xs font-medium text-neutral-500'>Description</label>
          <textarea
            value={card.description ?? ''}
            onChange={(event) => Obj.change(card, (mutable) => { mutable.description = event.target.value; })}
            rows={8}
            className='w-full rounded border border-neutral-600 bg-transparent px-3 py-2 text-sm'
          />
        </div>

        <div>
          <label className='mb-1 block text-xs font-medium text-neutral-500'>List</label>
          <div className='text-sm text-neutral-300'>{card.listName ?? 'Unknown'}</div>
        </div>

        {card.dueDate && (
          <div>
            <label className='mb-1 block text-xs font-medium text-neutral-500'>Due Date</label>
            <div className='text-sm text-neutral-300'>
              {new Date(card.dueDate).toLocaleDateString()}
              {card.dueComplete && ' (complete)'}
            </div>
          </div>
        )}

        {card.members && card.members.length > 0 && (
          <div>
            <label className='mb-1 block text-xs font-medium text-neutral-500'>Members</label>
            <div className='text-sm text-neutral-300'>
              {card.members.map((member) => member.fullName ?? member.username).join(', ')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
