//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { random } from '@dxos/random';
import { Input, Panel, Toolbar } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { Row, RowList } from './RowList';

random.seed(1);

type TestItem = { id: string; name: string; description: string };

const allItems: TestItem[] = Array.from({ length: 24 }, (_, i) => ({
  id: `item-${i}`,
  name: random.commerce.productName(),
  description: random.lorem.sentences(2),
}));

//
// Single configurable story for the basic-listbox variants
// (Default / Thin / WithDisabled). MasterDetail and WithToolbar
// diverge structurally and keep their own render functions per
// AUDIT.md §11.
//

type StoryArgs = {
  /** Items to render. Defaults to the full 24-item catalog. */
  items?: TestItem[];
  /** Forwards to `RowList.Viewport thin`. */
  thin?: boolean;
  /** Forwards to `RowList.Viewport padding`. */
  padding?: boolean;
  /** Index into `items` that should render disabled. */
  disabledIndex?: number;
  /** Render the description line under each row's name. */
  showDescription?: boolean;
};

const DefaultStory = ({
  items = allItems,
  thin = false,
  padding = false,
  disabledIndex,
  showDescription = true,
}: StoryArgs = {}) => {
  const [selected, setSelected] = useState<string | undefined>(items[0]?.id);
  return (
    <RowList.Root selectedId={selected} onSelectChange={setSelected}>
      <RowList.Viewport thin={thin} padding={padding}>
        <RowList.Content aria-label='Items'>
          {items.map((item, i) => {
            const disabled = i === disabledIndex;
            return (
              <Row key={item.id} id={item.id} disabled={disabled}>
                <div className='font-medium'>
                  {item.name}
                  {disabled && ' (disabled)'}
                </div>
                {showDescription && <div className='text-sm text-description line-clamp-1'>{item.description}</div>}
              </Row>
            );
          })}
        </RowList.Content>
      </RowList.Viewport>
    </RowList.Root>
  );
};

//
// Master/detail — list is one pane of a layout.
//

const MasterDetailStory = () => {
  const [selected, setSelected] = useState<string | undefined>(allItems[0].id);
  const detail = allItems.find(({ id }) => id === selected);
  return (
    <div className='dx-container grid grid-cols-[20rem_1fr] divide-x divide-separator'>
      <RowList.Root selectedId={selected} onSelectChange={setSelected}>
        <RowList.Viewport>
          <RowList.Content aria-label='Items'>
            {allItems.map((item) => (
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
  const [selected, setSelected] = useState<string | undefined>(allItems[0].id);
  const [filter, setFilter] = useState('');
  const filtered = allItems.filter((item) => item.name.toLowerCase().includes(filter.toLowerCase()));
  return (
    <RowList.Root selectedId={selected} onSelectChange={setSelected}>
      <Panel.Root>
        <Panel.Toolbar asChild>
          <Toolbar.Root>
            <Input.Root>
              <Input.Label srOnly>Filter items</Input.Label>
              <Input.TextInput
                placeholder='Filter…'
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
              />
            </Input.Root>
          </Toolbar.Root>
        </Panel.Toolbar>
        <Panel.Content asChild>
          <RowList.Viewport>
            <RowList.Content aria-label='Items'>
              {filtered.map((item) => (
                <Row key={item.id} id={item.id}>
                  {item.name}
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
  render: (args) => <DefaultStory {...args} />,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<StoryArgs>;

export const Default: Story = {};
export const Thin: Story = { args: { thin: true, padding: true, showDescription: false } };
export const WithDisabled: Story = { args: { items: allItems.slice(0, 6), disabledIndex: 2 } };
export const MasterDetail: Story = { render: () => <MasterDetailStory /> };
export const WithToolbar: Story = { render: () => <WithToolbarStory /> };
