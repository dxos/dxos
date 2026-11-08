//
// Copyright 2026 DXOS.org
//

import React from 'react';

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
  border = true,
  onSelect,
  onRemove,
}: {
  entry: Entry;
  selected?: boolean;
  /** Off inside a Popover, whose own frame would otherwise be doubled by the card's. */
  border?: boolean;
  onSelect?: (id: string) => void;
  onRemove?: (id: string) => void;
}) => (
  <Card.Root grid border={border} selected={selected} onClick={onSelect && (() => onSelect(entry.value))}>
    <Card.Header>
      {entry.icon && (
        <Layout.Block rail='start'>
          <Icon.Icon icon={entry.icon} />
        </Layout.Block>
      )}
      <Card.Title truncate>{entry.label}</Card.Title>
      {/* `Card.Action`, not a Button: its click stays with it, so removing a record does not also select it. */}
      {onRemove && <Card.Action icon='ph--x--regular' label='Remove' onClick={() => onRemove(entry.value)} />}
    </Card.Header>
    {entry.fields?.map((field, index) => (
      // Two addresses carry the same icon, so position is the only stable key here.
      <Card.Row key={index} icon={field.icon}>
        <Card.Text variant='muted' truncate>
          {field.value}
        </Card.Text>
      </Card.Row>
    ))}
  </Card.Root>
);
