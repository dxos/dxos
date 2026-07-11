//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { expect, waitFor, within } from 'storybook/test';

import { Panel, ScrollArea } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { MasterDetail } from './MasterDetail';

type Row = { id: string; label: string; icon: string };

// Enough rows to overflow the fixed-height container so the master column's scroll can be asserted.
const MANY: Row[] = Array.from({ length: 40 }, (_, index) => ({
  id: `row-${index}`,
  label: `Item ${index}`,
  icon: 'ph--circle--regular',
}));

const CATEGORIES: Row[] = [
  { id: 'fruit', label: 'Fruit', icon: 'ph--orange--regular' },
  { id: 'vegetable', label: 'Vegetables', icon: 'ph--carrot--regular' },
];

const ITEMS: Record<string, Row[]> = {
  fruit: [
    { id: 'apple', label: 'Apple', icon: 'ph--apple-logo--regular' },
    { id: 'banana', label: 'Banana', icon: 'ph--acorn--regular' },
  ],
  vegetable: [
    { id: 'carrot', label: 'Carrot', icon: 'ph--carrot--regular' },
    { id: 'pepper', label: 'Pepper', icon: 'ph--pepper--regular' },
  ],
};

// Full-page frame matching the real usage (e.g. the PDS browser): a `Panel` whose content is a bounded
// flex column that a horizontal `MasterDetail` fills via `flex-1`. Fixing scroll here fixes it there.
const PageFrame = ({ children }: { children: React.ReactNode }) => (
  <Panel.Root>
    <Panel.Content classNames='flex flex-col min-bs-0 p-2'>{children}</Panel.Content>
  </Panel.Root>
);

// Horizontal orientation: list and detail sit side-by-side as columns, each pane scrolling vertically. The
// master list overflows the full-height frame so its scroll is exercised by the play assertion.
const HorizontalStory = () => {
  const [selectedId, setSelectedId] = useState<string | undefined>('row-0');
  const selected = MANY.find((row) => row.id === selectedId);
  return (
    <PageFrame>
      <MasterDetail<Row>
        orientation='horizontal'
        classNames='flex-1 min-bs-0'
        items={MANY}
        selectedId={selectedId}
        onSelect={setSelectedId}
        getLabel={(_get, row) => row.label}
        getIcon={(_get, row) => ({ icon: row.icon })}
        emptyLabel='No items'
        detail={selected ? <div className='p-2 text-sm'>Selected: {selected.label}</div> : null}
      />
    </PageFrame>
  );
};

// Nested horizontal: the detail pane is itself a horizontal MasterDetail — the classic three-column
// master → detail → detail layout (category → items → item).
const NestedStory = () => {
  const [category, setCategory] = useState<string | undefined>('fruit');
  const [item, setItem] = useState<string | undefined>();
  const items = category ? (ITEMS[category] ?? []) : [];
  const selectedItem = items.find((row) => row.id === item);
  return (
    <PageFrame>
      <MasterDetail<Row>
        orientation='horizontal'
        classNames='flex-1 min-bs-0'
        items={CATEGORIES}
        selectedId={category}
        onSelect={(id) => {
          setCategory(id);
          setItem(undefined);
        }}
        getLabel={(_get, row) => row.label}
        getIcon={(_get, row) => ({ icon: row.icon })}
        emptyLabel='No categories'
        detail={
          category ? (
            <MasterDetail<Row>
              orientation='horizontal'
              classNames='flex-1 min-bs-0'
              items={items}
              selectedId={item}
              onSelect={setItem}
              getLabel={(_get, row) => row.label}
              getIcon={(_get, row) => ({ icon: row.icon })}
              emptyLabel='No items'
              detail={selectedItem ? <div className='p-2 text-sm'>Selected: {selectedItem.label}</div> : null}
            />
          ) : null
        }
      />
    </PageFrame>
  );
};

const BasicStory = () => {
  const [selectedId, setSelectedId] = useState<string | undefined>('fruit');
  const selected = CATEGORIES.find((row) => row.id === selectedId);
  return (
    <Panel.Root>
      <Panel.Content asChild className='pt-trim-md'>
        <ScrollArea.Root orientation='vertical'>
          <ScrollArea.Viewport>
            <MasterDetail<Row>
              classNames='dx-document'
              items={CATEGORIES}
              selectedId={selectedId}
              onSelect={setSelectedId}
              getLabel={(_get, row) => row.label}
              getIcon={(_get, row) => ({ icon: row.icon })}
              emptyLabel='No categories'
              detail={selected ? <div className='p-2 text-sm'>Selected: {selected.label}</div> : null}
            />
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Content>
    </Panel.Root>
  );
};

const meta = {
  title: 'ui/react-ui-list/MasterDetail',
  decorators: [withTheme()],
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  render: () => <BasicStory />,
  decorators: [withLayout({ layout: 'column' })],
};

// Horizontal and nested run full-page (not centered) so the columns' width behaviour is exercised.
export const Horizontal: Story = {
  render: () => <HorizontalStory />,
  decorators: [withLayout({ layout: 'fullscreen' })],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // The master list renders as a `role=list`; its nearest scroll viewport must overflow (scroll) rather
    // than stretch to fit all 40 rows — proving vertical per-column scroll in horizontal orientation.
    await waitFor(() => expect(canvas.getAllByRole('listitem').length).toBeGreaterThan(0));
    const viewport = canvasElement.querySelector('[role="list"]')?.closest('.overflow-y-scroll');
    if (!(viewport instanceof HTMLElement)) {
      throw new Error('master scroll viewport not found');
    }
    await waitFor(() => expect(viewport.scrollHeight).toBeGreaterThan(viewport.clientHeight + 8));
  },
};

export const Nested: Story = {
  render: () => <NestedStory />,
  decorators: [withLayout({ layout: 'fullscreen' })],
};
