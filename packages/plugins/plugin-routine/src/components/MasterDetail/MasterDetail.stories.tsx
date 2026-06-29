//
// Copyright 2026 DXOS.org
//

import { type Atom } from '@effect-atom/atom-react';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Schema from 'effect/Schema';
import React, { useState } from 'react';

import { Panel, ScrollArea } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { MasterDetail, type MasterDetailIcon } from './MasterDetail';

type Row = { id: string; label: string };

const ROWS: Row[] = [
  { id: '1', label: 'Daily digest' },
  { id: '2', label: 'Sync inbox' },
  { id: '3', label: 'Weekly report' },
];

const DetailSchema = Schema.Struct({
  name: Schema.String.annotations({ title: 'Name' }),
  description: Schema.optional(Schema.String).annotations({ title: 'Description' }),
});

// Mirrors RoutineForm's gutter (Form.Viewport owns a `Column.Root` gutter); used to check list/detail alignment.
const MockDetail = ({ row }: { row: Row }) => (
  <Form.Root schema={DetailSchema} values={{ name: row.label, description: '' }}>
    <Form.Viewport>
      <Form.Content>
        <Form.FieldSet />
      </Form.Content>
    </Form.Viewport>
  </Form.Root>
);

const getIcon = (_get: Atom.Context): MasterDetailIcon => ({ icon: 'ph--lightning--regular' });

const DefaultStory = () => {
  const [selectedId, setSelectedId] = useState<string | undefined>('1');
  const selected = ROWS.find((row) => row.id === selectedId);

  return (
    <Panel.Root>
      <Panel.Content asChild className='pt-trim-md'>
        <ScrollArea.Root orientation='vertical'>
          <ScrollArea.Viewport>
            <MasterDetail<Row>
              classNames='dx-document'
              items={ROWS}
              selectedId={selectedId}
              onSelect={setSelectedId}
              getLabel={(_get, row) => row.label}
              getIcon={getIcon}
              detail={selected ? <MockDetail row={selected} /> : null}
              emptyLabel='No items'
            />
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Content>
    </Panel.Root>
  );
};

const meta = {
  title: 'plugins/plugin-routine/components/MasterDetail',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: { layout: 'fullscreen', translations },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
  render: () => (
    <Panel.Root>
      <Panel.Content asChild className='pt-trim-md'>
        <ScrollArea.Root orientation='vertical'>
          <ScrollArea.Viewport>
            <MasterDetail<Row>
              classNames='dx-document'
              items={[]}
              getLabel={(_get, row) => row.label}
              emptyLabel='No items'
            />
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Content>
    </Panel.Root>
  ),
};
