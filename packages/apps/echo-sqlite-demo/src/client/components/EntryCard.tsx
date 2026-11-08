//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Button from '@dxos/react-ui/Button';
import * as Card from '@dxos/react-ui/Card';
import * as Icon from '@dxos/react-ui/Icon';
import * as Layout from '@dxos/react-ui/Layout';

import { type Entry } from './ListView.tsx';

/**
 * One record as a card: the icon, title and delete action in the header, the rest below.
 *
 * `grid` makes the card a rail Container, which is what puts the icon and the button in its gutters
 * rather than inline with the title.
 */
export const EntryCard = ({
  entry,
  selected,
  onSelect,
  onRemove,
}: {
  entry: Entry;
  selected?: boolean;
  onSelect?: (id: string) => void;
  onRemove?: (id: string) => void;
}) => (
  <Card.Root grid border selected={selected} onClick={onSelect && (() => onSelect(entry.value))}>
    <Card.Header>
      {entry.icon && (
        <Layout.Block rail='start'>
          <Icon.Icon icon={entry.icon} />
        </Layout.Block>
      )}
      <Card.Title truncate>{entry.label}</Card.Title>
      {onRemove && (
        <Button.Root
          iconOnly
          icon='ph--x--regular'
          variant='ghost'
          label='Remove'
          onClick={() => onRemove(entry.value)}
        />
      )}
    </Card.Header>
    {entry.description && (
      <Card.Row>
        <Card.Text variant='muted'>{entry.description}</Card.Text>
      </Card.Row>
    )}
  </Card.Root>
);
