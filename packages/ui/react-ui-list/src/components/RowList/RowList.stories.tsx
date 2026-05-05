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

const items: TestItem[] = Array.from({ length: 24 }, (_, i) => ({
  id: `item-${i}`,
  name: `Item ${i + 1}`,
  description: random.lorem.sentence(),
}));

//
// RowList — dense rows with bottom dividers. The list fills its parent
// (column layout supplies full height + a sane default width) thanks to
// `dx-container` baked into the base class.
//

const RowListStory = () => {
  const [selected, setSelected] = useState<string | undefined>(items[0].id);
  return (
    <RowList selectedId={selected} onSelectChange={setSelected} aria-label='Items'>
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
    <CardList classNames='p-2' selectedId={selected} onSelectChange={setSelected} aria-label='Items'>
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
// Disabled rows.
//

const DisabledStory = () => {
  const [selected, setSelected] = useState<string | undefined>(items[0].id);
  return (
    <RowList selectedId={selected} onSelectChange={setSelected} aria-label='Items'>
      {items.slice(0, 6).map((item, i) => (
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

//
// Master/detail — list is one half of a layout, NOT filling everything.
// Demonstrates that wrapping in a sized parent (or overriding classNames)
// composes cleanly with the dx-container default.
//

const MasterDetailStory = () => {
  const [selected, setSelected] = useState<string | undefined>(items[0].id);
  const detail = items.find(({ id }) => id === selected);
  return (
    <div role='none' className='dx-container grid grid-cols-[20rem_1fr] divide-x divide-separator'>
      <RowList selectedId={selected} onSelectChange={setSelected} aria-label='Items'>
        {items.map((item) => (
          <Row key={item.id} id={item.id}>
            <div className='font-medium'>{item.name}</div>
          </Row>
        ))}
      </RowList>
      <div role='region' aria-label='Detail' className='dx-container p-4 overflow-auto'>
        {detail && (
          <>
            <h2 className='text-lg font-semibold'>{detail.name}</h2>
            <p className='text-description mt-2'>{detail.description}</p>
          </>
        )}
      </div>
    </div>
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
export const MasterDetail: Story = { render: MasterDetailStory };
