//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { random } from '@dxos/random';
import { Panel, Toolbar } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { Row, RowList } from './RowList';

random.seed(1);

type TestItem = { id: string; name: string; description: string };

const items: TestItem[] = Array.from({ length: 24 }, (_, i) => ({
  id: `item-${i}`,
  name: `Item ${i + 1}`,
  description: random.lorem.sentence(),
}));

//
// Default — Viewport always scrolls; Content is the listbox `<ul>`.
//

const DefaultStory = () => {
  const [current, setCurrent] = useState<string | undefined>(items[0].id);
  return (
    <RowList.Root currentId={current} onCurrentChange={setCurrent}>
      <RowList.Viewport>
        <RowList.Content aria-label='Items'>
          {items.map((item) => (
            <Row key={item.id} id={item.id}>
              <div className='font-medium'>{item.name}</div>
              <div className='text-sm text-description line-clamp-1'>{item.description}</div>
            </Row>
          ))}
        </RowList.Content>
      </RowList.Viewport>
    </RowList.Root>
  );
};

//
// Thin scrollbar — exercises the forwarded ScrollArea knob.
//

const ThinStory = () => {
  const [current, setCurrent] = useState<string | undefined>(items[0].id);
  return (
    <RowList.Root currentId={current} onCurrentChange={setCurrent}>
      <RowList.Viewport thin padding>
        <RowList.Content aria-label='Items'>
          {items.map((item) => (
            <Row key={item.id} id={item.id}>
              <div className='font-medium'>{item.name}</div>
            </Row>
          ))}
        </RowList.Content>
      </RowList.Viewport>
    </RowList.Root>
  );
};

//
// Disabled rows.
//

const DisabledStory = () => {
  const [current, setCurrent] = useState<string | undefined>(items[0].id);
  return (
    <RowList.Root currentId={current} onCurrentChange={setCurrent}>
      <RowList.Viewport>
        <RowList.Content aria-label='Items'>
          {items.slice(0, 6).map((item, i) => (
            <Row key={item.id} id={item.id} disabled={i === 2}>
              <div className='font-medium'>
                {item.name}
                {i === 2 && ' (disabled)'}
              </div>
              <div className='text-sm text-description line-clamp-1'>{item.description}</div>
            </Row>
          ))}
        </RowList.Content>
      </RowList.Viewport>
    </RowList.Root>
  );
};

//
// Master/detail — list is one pane of a layout.
//

const MasterDetailStory = () => {
  const [current, setCurrent] = useState<string | undefined>(items[0].id);
  const detail = items.find(({ id }) => id === current);
  return (
    <div role='none' className='dx-container grid grid-cols-[20rem_1fr] divide-x divide-separator'>
      <RowList.Root currentId={current} onCurrentChange={setCurrent}>
        <RowList.Viewport>
          <RowList.Content aria-label='Items'>
            {items.map((item) => (
              <Row key={item.id} id={item.id}>
                <div className='font-medium'>{item.name}</div>
              </Row>
            ))}
          </RowList.Content>
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
// caller's responsibility. `Panel` is the canonical chrome wrapper.
//

const WithToolbarStory = () => {
  const [current, setCurrent] = useState<string | undefined>(items[0].id);
  const [filter, setFilter] = useState('');
  const filtered = items.filter((item) => item.name.toLowerCase().includes(filter.toLowerCase()));
  return (
    <RowList.Root currentId={current} onCurrentChange={setCurrent}>
      <Panel.Root>
        <Panel.Toolbar asChild>
          <Toolbar.Root>
            <input
              type='text'
              aria-label='Filter items'
              placeholder='Filter…'
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              className='w-full bg-transparent outline-none'
            />
          </Toolbar.Root>
        </Panel.Toolbar>
        <Panel.Content asChild>
          <RowList.Viewport>
            <RowList.Content aria-label='Items'>
              {filtered.map((item) => (
                <Row key={item.id} id={item.id}>
                  <div className='font-medium'>{item.name}</div>
                </Row>
              ))}
            </RowList.Content>
          </RowList.Viewport>
        </Panel.Content>
      </Panel.Root>
    </RowList.Root>
  );
};

const meta = {
  title: 'ui/react-ui-list/RowList',
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = { render: DefaultStory };
export const Thin: Story = { render: ThinStory };
export const WithDisabled: Story = { render: DisabledStory };
export const MasterDetail: Story = { render: MasterDetailStory };
export const WithToolbar: Story = { render: WithToolbarStory };
