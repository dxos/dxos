//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { random } from '@dxos/random';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { Card, CardList, Row, RowList } from './RowList';

random.seed(1);

type TestItem = { id: string; name: string; description: string };

const items: TestItem[] = Array.from({ length: 12 }, (_, i) => ({
  id: `item-${i}`,
  name: `Item ${i + 1}`,
  description: random.lorem.sentence(),
}));

//
// RowList — dense rows with bottom dividers.
//

const RowListStory = () => {
  const [selected, setSelected] = useState<string | undefined>(items[0].id);
  return (
    <RowList
      classNames='w-[28rem] max-h-[24rem] overflow-auto border border-separator rounded-md'
      selectedId={selected}
      onSelectChange={setSelected}
      aria-label='Items'
    >
      {items.map((item) => (
        <Row key={item.id} id={item.id}>
          <div className='font-medium'>{item.name}</div>
          <div className='text-sm text-description line-clamp-1'>{item.description}</div>
        </Row>
      ))}
    </RowList>
  );
};

//
// CardList — gapped cards on a separate surface.
//

const CardListStory = () => {
  const [selected, setSelected] = useState<string | undefined>();
  return (
    <CardList
      classNames='w-[28rem] max-h-[24rem] overflow-auto p-2'
      selectedId={selected}
      onSelectChange={setSelected}
      aria-label='Items'
    >
      {items.map((item) => (
        <Card key={item.id} id={item.id}>
          <div className='font-medium'>{item.name}</div>
          <div className='text-sm text-description'>{item.description}</div>
        </Card>
      ))}
    </CardList>
  );
};

//
// Mixed disabled state.
//

const DisabledStory = () => {
  const [selected, setSelected] = useState<string | undefined>(items[0].id);
  return (
    <RowList
      classNames='w-[28rem] border border-separator rounded-md'
      selectedId={selected}
      onSelectChange={setSelected}
      aria-label='Items'
    >
      {items.slice(0, 5).map((item, i) => (
        <Row key={item.id} id={item.id} disabled={i === 2}>
          <div className='font-medium'>
            {item.name}
            {i === 2 && ' (disabled)'}
          </div>
          <div className='text-sm text-description line-clamp-1'>{item.description}</div>
        </Row>
      ))}
    </RowList>
  );
};

const meta = {
  title: 'ui/react-ui-list/RowList',
  decorators: [withTheme(), withLayout({ layout: 'column' })],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Rows: Story = { render: RowListStory };
export const Cards: Story = { render: CardListStory };
export const WithDisabled: Story = { render: DisabledStory };
