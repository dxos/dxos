//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Schema from 'effect/Schema';
import React, { useState } from 'react';

import { Form } from '@dxos/react-ui-form';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { MultiSelectList } from './Example';
import { Splitter } from './Splitter';

//
// SPIKE stories for the zag probe: the custom multi-select machine driving a list, and the stock
// splitter machine framing the master-detail arrangement. No registry or template here — the
// point is the machines standing alone as capabilities.
//

const OrganizationSchema = Schema.Struct({
  name: Schema.String.pipe(Schema.annotate({ title: 'Name' }), Schema.optional),
  status: Schema.Literals(['prospect', 'qualified', 'active']).pipe(
    Schema.annotate({ title: 'Status' }),
    Schema.optional,
  ),
  website: Schema.String.pipe(Schema.annotate({ title: 'Website' }), Schema.optional),
});

type OrganizationValues = Schema.Schema.Type<typeof OrganizationSchema>;

type OrganizationRow = OrganizationValues & { id: string };

const ORGANIZATIONS: OrganizationRow[] = [
  'Blue Yard',
  'Backed',
  'Protocol Labs',
  'DXOS',
  'Ink & Switch',
  'Socket Supply',
].map((name, index) => ({
  id: `org-${index + 1}`,
  name,
  status: index % 2 === 0 ? 'prospect' : 'active',
}));

type StoryArgs = {
  /** Frame the list and detail form in the resizable splitter. */
  splitter?: boolean;
};

const DefaultStory = ({ splitter }: StoryArgs) => {
  const [organizations, setOrganizations] = useState(ORGANIZATIONS);
  const [selection, setSelection] = useState<ReadonlySet<string>>(new Set());

  // The detail subject: the most recently selected id still present in the data.
  const selectedId = [...selection].at(-1);
  const selected = organizations.find((org) => org.id === selectedId);

  const list = (
    <MultiSelectList items={organizations.map(({ id, name }) => ({ id, label: name ?? id }))} onChange={setSelection} />
  );

  const detail = selected ? (
    <Form.Root
      key={selected.id}
      schema={OrganizationSchema}
      defaultValues={selected}
      onSave={(values: OrganizationValues) =>
        setOrganizations((current) => current.map((org) => (org.id === selected.id ? { ...org, ...values } : org)))
      }
    >
      <Form.Viewport scroll>
        <Form.Content>
          <Form.FieldSet />
          <Form.Actions />
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  ) : (
    <span className='p-2 text-sm text-description'>Nothing selected.</span>
  );

  if (splitter) {
    return (
      <div className='flex grow min-h-0 dx-base-surface'>
        <Splitter orientation='vertical' panes={[list, detail]} />
      </div>
    );
  }

  return (
    <div className='flex flex-col w-96 min-h-0 dx-base-surface divide-y divide-separator border-e border-separator'>
      <div className='flex flex-col grow min-h-0'>{list}</div>
      <div className='p-2 text-xs font-mono text-description'>
        {selection.size > 0 ? [...selection].join(', ') : 'Nothing selected.'}
      </div>
    </div>
  );
};

const meta: Meta<typeof DefaultStory> = {
  title: 'ui/ui-template/Example',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen', translations: formTranslations },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const MultiSelect: Story = {
  args: {},
};

export const MasterDetailSplitter: Story = {
  args: { splitter: true },
};
