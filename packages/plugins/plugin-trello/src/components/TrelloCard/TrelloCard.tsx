//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Card, Icon } from '@dxos/react-ui';

import { type Trello } from '#types';

export type TrelloCardProps = {
  card: Trello.TrelloCard;
};

/**
 * Inline card renderer for `card--content` surfaces (Kanban tiles, search hits, etc.).
 * Title + listName + open-in-Trello link, no controls.
 */
export const TrelloCard = ({ card }: TrelloCardProps) => {
  return (
    <Card.Content>
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
      {card.listName && (
        <Card.Row icon='ph--columns--regular'>
          <Card.Text variant='description'>{card.listName}</Card.Text>
        </Card.Row>
      )}
      {card.description && (
        <Card.Row>
          <Card.Text variant='description' classNames='line-clamp-3'>
            {card.description}
          </Card.Text>
        </Card.Row>
      )}
    </Card.Content>
  );
};
