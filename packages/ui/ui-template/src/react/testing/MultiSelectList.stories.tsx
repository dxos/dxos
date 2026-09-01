//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Schema from 'effect/Schema';
import React, { useState } from 'react';

import { Form } from '@dxos/react-ui-form';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { Splitter } from '../Splitter';
import { MultiSelectList } from './MultiSelectList';

//
// SPIKE stories for the zag probe: the custom multi-select machine driving a list, and the stock
// splitter machine framing the master-detail arrangement. No registry or template here — the
// point is the machines standing alone as capabilities.
//

const TaskSchema = Schema.Struct({
  title: Schema.String.pipe(Schema.annotate({ title: 'Title' }), Schema.optional),
  status: Schema.Literals(['todo', 'started', 'done']).pipe(Schema.annotate({ title: 'Status' }), Schema.optional),
});

type TaskValues = Schema.Schema.Type<typeof TaskSchema>;

type TaskRow = TaskValues & { id: string };

const TASKS: TaskRow[] = [
  'Write release notes',
  'Fix login redirect',
  'Update onboarding docs',
  'Review open pull requests',
  'Ship beta build',
  'Triage support inbox',
].map((title, index) => ({
  id: `task-${index + 1}`,
  title,
  status: index % 2 === 0 ? 'todo' : 'started',
}));

type StoryArgs = {
  /** Frame the list and detail form in the resizable splitter. */
  splitter?: boolean;
};

const DefaultStory = ({ splitter }: StoryArgs) => {
  const [tasks, setTasks] = useState(TASKS);
  const [selection, setSelection] = useState<ReadonlySet<string>>(new Set());

  // The detail subject: the most recently selected id still present in the data.
  const selectedId = [...selection].at(-1);
  const selected = tasks.find((task) => task.id === selectedId);

  const list = (
    <MultiSelectList items={tasks.map(({ id, title }) => ({ id, label: title ?? id }))} onChange={setSelection} />
  );

  const detail = selected ? (
    <Form.Root
      key={selected.id}
      schema={TaskSchema}
      defaultValues={selected}
      onSave={(values: TaskValues) =>
        setTasks((current) => current.map((task) => (task.id === selected.id ? { ...task, ...values } : task)))
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
      <div className='flex dx-grow dx-base-surface'>
        <Splitter orientation='vertical' panes={[list, detail]} />
      </div>
    );
  }

  return (
    <div className='flex flex-col dx-grow dx-base-surface divide-y divide-separator border-e border-separator'>
      <div className='flex flex-col dx-grow'>{list}</div>
      <div className='p-2 text-xs font-mono text-description'>
        {selection.size > 0 ? [...selection].join(', ') : 'Nothing selected.'}
      </div>
    </div>
  );
};

const meta: Meta<typeof DefaultStory> = {
  title: 'ui/ui-template/MultiSelect',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen', classNames: '2-96' })],
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
