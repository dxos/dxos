//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useRef, useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Filter, Tag } from '@dxos/echo';
import { useClientStory, withClientProvider } from '@dxos/react-client/testing';
import { type EditorController } from '@dxos/react-ui-editor';
import { translations as queryTranslations } from '@dxos/react-ui-query/translations';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { translations } from '#translations';

import { QueryFilter } from './QueryFilter.tsx';

// Sample tags so the `#` autocomplete has something to offer, created at render time to avoid
// Storybook serialization issues with ECHO objects (see the QueryEditor story for the same pattern).
const createTags = (): Tag.Map => ({
  tag_1: Tag.make({ label: 'Important' }),
  tag_2: Tag.make({ label: 'Investor' }),
});

type StoryArgs = {
  value?: string;
};

const DefaultStory = ({ value: valueProp = '' }: StoryArgs) => {
  const { space } = useClientStory();
  const [tags] = useState<Tag.Map>(createTags);
  const [value, setValue] = useState(valueProp);
  // The editor's own parse, so the story exercises the real save-gating rather than a stand-in.
  const [filter, setFilter] = useState<Filter.Any>();
  const editorRef = useRef<EditorController>(null);
  const saveButtonRef = useRef<HTMLButtonElement>(null);

  return (
    <div>
      <Toolbar.Root>
        <QueryFilter
          db={space?.db}
          tags={tags}
          filter={filter}
          value={value}
          onChange={setValue}
          onFilterChange={setFilter}
          onSave={() => console.log('save')}
          onClear={() => {
            setValue('');
            setFilter(undefined);
          }}
          editorRef={editorRef}
          saveButtonRef={saveButtonRef}
        />
      </Toolbar.Root>
      <pre className='p-2' data-testid='filter-value'>
        {JSON.stringify({ value, parses: !!filter }, null, 2)}
      </pre>
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-inbox/components/QueryFilter',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'column' }),
    withClientProvider({ createIdentity: true, createSpace: true }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations: [...translations, ...queryTranslations],
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    value: '#important foo',
  },
};

export const Test: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // The filter row's editor is a CodeMirror `QueryEditor`, not an <input>/<textarea> - the only
    // editor instance on the canvas, so the first `.cm-content` is unambiguous. CodeMirror mounts
    // asynchronously (after the story's initial paint), so poll for it rather than querying once.
    const getEditor = () => canvasElement.querySelector('.cm-editor')?.querySelector<HTMLElement>('.cm-content');
    await waitFor(() => expect(getEditor()).toBeTruthy(), { timeout: 12_000 });
    const editor = getEditor();
    if (!editor) {
      throw new Error('Filter editor not found.');
    }

    await userEvent.click(editor);

    // Focused and empty, the editor shows only the filter's own placeholder - not the trigger hint too.
    // The hint is a delayed placeholder (3s after focus), so wait past its delay before asserting.
    await new Promise((resolve) => setTimeout(resolve, 3_500));
    await waitFor(() =>
      expect(
        Array.from(canvasElement.querySelectorAll('.cm-placeholder'), (element) => element.textContent).join(''),
      ).toBe('Enter text to filter, or a query (e.g., "#tag")'),
    );

    await userEvent.type(editor, '#important');

    // Typing in the editor round-trips through `onChange` into the story's own `value` state, proved
    // by the bound `data-testid` element below.
    await waitFor(() => expect(canvas.getByTestId('filter-value')).toHaveTextContent('#important'));
  },
};
