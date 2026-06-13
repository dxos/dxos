//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { random } from '@dxos/random';
import { Input, Panel, Toolbar } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { Listbox } from './Listbox';

random.seed(1);

type TestItem = { id: string; name: string; description: string };

const allItems: TestItem[] = Array.from({ length: 24 }, (_, i) => ({
  id: `item-${i}`,
  name: random.commerce.productName(),
  description: random.lorem.sentences(2),
}));

//
// Configurable basic story (Default / Thin / WithDisabled / Compact share this body).
//

type StoryArgs = {
  /** Items to render. Defaults to the full 24-item catalog. */
  items?: TestItem[];
  /** Forwards to `Listbox.Viewport thin`. */
  thin?: boolean;
  /** Forwards to `Listbox.Viewport padding`. */
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
    <Listbox.Root value={selected} onValueChange={setSelected}>
      <Listbox.Viewport thin={thin} padding={padding}>
        <Listbox.Content aria-label='Items'>
          {items.map((item, i) => {
            const disabled = i === disabledIndex;
            return (
              <Listbox.Item key={item.id} id={item.id} disabled={disabled}>
                <div className='flex flex-col gap-0.5 overflow-hidden'>
                  <div className='font-medium'>
                    {item.name}
                    {disabled && ' (disabled)'}
                  </div>
                  {showDescription && <div className='text-sm text-description line-clamp-1'>{item.description}</div>}
                </div>
              </Listbox.Item>
            );
          })}
        </Listbox.Content>
      </Listbox.Viewport>
    </Listbox.Root>
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
      <Listbox.Root value={selected} onValueChange={setSelected}>
        <Listbox.Viewport>
          <Listbox.Content aria-label='Items'>
            {allItems.map((item) => (
              <Listbox.Item key={item.id} id={item.id}>
                <div className='font-medium'>{item.name}</div>
              </Listbox.Item>
            ))}
          </Listbox.Content>
        </Listbox.Viewport>
      </Listbox.Root>
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
// Toolbar + viewport siblings — Root is headless, so layout is the caller's responsibility.
// `Panel` is the canonical chrome wrapper.
//

const WithToolbarStory = () => {
  const [selected, setSelected] = useState<string | undefined>(allItems[0].id);
  const [filter, setFilter] = useState('');
  const filtered = allItems.filter((item) => item.name.toLowerCase().includes(filter.toLowerCase()));
  return (
    <Listbox.Root value={selected} onValueChange={setSelected}>
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
          <Listbox.Viewport>
            <Listbox.Content aria-label='Items'>
              {filtered.map((item) => (
                <Listbox.Item key={item.id} id={item.id}>
                  {item.name}
                </Listbox.Item>
              ))}
            </Listbox.Content>
          </Listbox.Viewport>
        </Panel.Content>
      </Panel.Root>
    </Listbox.Root>
  );
};

//
// Popover variant — no Viewport (caller's popover/dialog owns scroll). Uses the
// `Listbox.ItemLabel` + `Listbox.Indicator` slots for a confirmatory checkmark.
//

type Option = { value: string; label: string };

const popoverOptions: Option[] = random.helpers.multiple(
  () => ({ value: random.string.uuid(), label: random.commerce.productName() }) satisfies Option,
  { count: 8 },
);

const PopoverStory = () => {
  const [selected, setSelected] = useState<string | undefined>(popoverOptions[0]?.value);
  return (
    <div className='max-w-xs p-2 ring-1 ring-subdued-separator rounded'>
      <Listbox.Root value={selected} onValueChange={setSelected}>
        <Listbox.Content aria-label='Models'>
          {popoverOptions.map((option) => (
            <Listbox.Item
              key={option.value}
              id={option.value}
              // Compact / popover styling (the previous standalone `Listbox.Option` look).
              classNames='px-2 py-1 dx-focus-ring rounded-xs'
            >
              <Listbox.ItemLabel>{option.label}</Listbox.ItemLabel>
              <Listbox.Indicator />
            </Listbox.Item>
          ))}
        </Listbox.Content>
      </Listbox.Root>
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-list/Listbox',
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
export const Popover: Story = { render: () => <PopoverStory /> };
