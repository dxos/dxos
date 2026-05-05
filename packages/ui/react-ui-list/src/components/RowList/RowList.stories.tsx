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
// RowList — dense rows with bottom dividers. Viewport carries
// `dx-container`, so when it's the only child of a flex column it
// fills the available space and scrolls (ScrollArea-backed).
//

const RowsStory = () => {
  const [selected, setSelected] = useState<string | undefined>(items[0].id);
  return (
    <RowList.Root selectedId={selected} onSelectChange={setSelected}>
      <RowList.Viewport aria-label='Items'>
        {items.map((item) => (
          <Row key={item.id} id={item.id}>
            <div className='font-medium'>{item.name}</div>
            <div className='text-sm text-description line-clamp-1'>{item.description}</div>
          </Row>
        ))}
      </RowList.Viewport>
    </RowList.Root>
  );
};

//
// CardList — gapped cards on a separate surface.
//

const CardsStory = () => {
  const [selected, setSelected] = useState<string | undefined>();
  return (
    <CardList.Root selectedId={selected} onSelectChange={setSelected}>
      <CardList.Viewport aria-label='Items'>
        {items.map((item) => (
          <Card key={item.id} id={item.id}>
            <div className='font-medium'>{item.name}</div>
            <div className='text-sm text-description'>{item.description}</div>
          </Card>
        ))}
      </CardList.Viewport>
    </CardList.Root>
  );
};

//
// Disabled rows.
//

const DisabledStory = () => {
  const [selected, setSelected] = useState<string | undefined>(items[0].id);
  return (
    <RowList.Root selectedId={selected} onSelectChange={setSelected}>
      <RowList.Viewport aria-label='Items'>
        {items.slice(0, 6).map((item, i) => (
          <Row key={item.id} id={item.id} disabled={i === 2}>
            <div className='font-medium'>
              {item.name}
              {i === 2 && ' (disabled)'}
            </div>
            <div className='text-sm text-description line-clamp-1'>{item.description}</div>
          </Row>
        ))}
      </RowList.Viewport>
    </RowList.Root>
  );
};

//
// Master/detail — list is one pane of a layout. Wrapping the list in a
// sized parent composes cleanly with the Viewport's `dx-container`.
//

const MasterDetailStory = () => {
  const [selected, setSelected] = useState<string | undefined>(items[0].id);
  const detail = items.find(({ id }) => id === selected);
  return (
    <div role='none' className='dx-container grid grid-cols-[20rem_1fr] divide-x divide-separator'>
      <RowList.Root selectedId={selected} onSelectChange={setSelected}>
        <RowList.Viewport aria-label='Items'>
          {items.map((item) => (
            <Row key={item.id} id={item.id}>
              <div className='font-medium'>{item.name}</div>
            </Row>
          ))}
        </RowList.Viewport>
      </RowList.Root>
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

//
// Toolbar + viewport siblings — Root is headless, so layout is the
// caller's responsibility. Wrap in your own flex column.
//

const WithToolbarStory = () => {
  const [selected, setSelected] = useState<string | undefined>(items[0].id);
  const [filter, setFilter] = useState('');
  const filtered = items.filter((item) => item.name.toLowerCase().includes(filter.toLowerCase()));
  return (
    <RowList.Root selectedId={selected} onSelectChange={setSelected}>
      <div role='none' className='dx-container flex flex-col'>
        <div role='none' className='border-b border-separator p-2'>
          <input
            type='text'
            placeholder='Filter…'
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className='w-full bg-transparent outline-none'
          />
        </div>
        <RowList.Viewport aria-label='Items'>
          {filtered.map((item) => (
            <Row key={item.id} id={item.id}>
              <div className='font-medium'>{item.name}</div>
            </Row>
          ))}
        </RowList.Viewport>
      </div>
    </RowList.Root>
  );
};

const meta = {
  title: 'ui/react-ui-list/RowList',
  decorators: [withTheme(), withLayout({ layout: 'column' })],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Rows: Story = { render: RowsStory };
export const Cards: Story = { render: CardsStory };
export const WithDisabled: Story = { render: DisabledStory };
export const MasterDetail: Story = { render: MasterDetailStory };
export const WithToolbar: Story = { render: WithToolbarStory };
