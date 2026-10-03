//
// Copyright 2025 DXOS.org
//

import { EditorView } from '@codemirror/view';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useMemo, useState } from 'react';
import { expect, userEvent, waitFor } from 'storybook/test';

import { type Filter, Tag } from '@dxos/echo';
import { useClientStory, withClientProvider } from '@dxos/react-client/testing';
import { Toolbar } from '@dxos/react-ui';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Employer, Organization, Person, Pipeline } from '@dxos/types';

import { translations } from '#translations';

import { QueryEditor, type QueryEditorProps } from './QueryEditor.tsx';

// Create tags at render time to avoid Storybook serialization issues with ECHO objects.
const createTags = (): Tag.Map => ({
  tag_1: Tag.make({ label: 'Important' }),
  tag_2: Tag.make({ label: 'Investor' }),
  tag_3: Tag.make({ label: 'New' }),
});

const DefaultStory = (args: QueryEditorProps) => {
  const { space } = useClientStory();
  const [filter, setFilter] = useState<Filter.Any>();
  // Create tags and builder at render time to avoid Storybook serialization issues.
  const tags = useMemo(() => args.tags ?? createTags(), [args.tags]);

  // The editor parses the DSL itself; a story that rebuilt the filter here would be exercising its
  // own `QueryBuilder` rather than the component's.
  const handleFilterChange = useCallback<NonNullable<QueryEditorProps['onFilterChange']>>(
    ({ filter }) => setFilter(filter),
    [],
  );

  return (
    <div className='flex flex-col gap-2'>
      <Toolbar.Root>
        <QueryEditor {...args} db={space?.db} tags={tags} onFilterChange={handleFilterChange} />
      </Toolbar.Root>

      <JsonHighlighter data={filter} classNames='text-xs' />
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-components/QueryEditor',
  component: QueryEditor,
  render: (args: QueryEditorProps) => <DefaultStory {...args} />,
  decorators: [
    withTheme(),
    withLayout({ layout: 'column' }),
    withClientProvider({
      types: [Organization.Organization, Person.Person, Pipeline.Pipeline, Employer.Employer],
      createIdentity: true,
    }),
  ],
  parameters: {
    translations,
  },
} satisfies Meta<typeof QueryEditor>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Complex: Story = {
  args: {
    autoFocus: true,
    value: '#important OR type:org.dxos.type.person AND { title: "DXOS", value: true }',
  },
};

export const Relation: Story = {
  args: {
    autoFocus: true,
    value: '(type:org.dxos.type.person -> type:org.dxos.type.organization)',
  },
};

export const Tags: Story = {
  args: {
    autoFocus: true,
    value: 'type:org.dxos.type.person #investor #new',
  },
  play: async ({ canvasElement }) => {
    const content = await waitFor(() => {
      const element = canvasElement.querySelector<HTMLElement>('.cm-content');
      if (!element) {
        throw new Error('Query editor content not found.');
      }
      return element;
    });

    // The document, not `textContent`: a type filter is drawn as a widget, so the rendered text is
    // the chip's label rather than what the document holds.
    const view = EditorView.findFromDOM(content)!;

    // `selectionEnd` puts the caret at the end of the document on the first render.
    await waitFor(() => expect(view.state.selection.main.head).toEqual(view.state.doc.length));

    // Which is what makes the first keystroke append rather than land in front of the query.
    await userEvent.keyboard('X');
    await waitFor(() => expect(view.state.doc.toString()).toEqual('type:org.dxos.type.person #investor #newX '));
  },
};

/**
 * A tag behaves as a single object: one Backspace or Delete removes the whole chip, and text typed
 * against either edge is separated from it by a space, with a trailing space always left to type
 * into. Driven through real keystrokes, since atomicity is enforced by CodeMirror's own cursor and
 * delete commands rather than by the decorations the unit tests inspect.
 */
export const Atomic: Story = {
  args: {
    autoFocus: true,
    value: '#test',
  },
  play: async ({ canvasElement }) => {
    const content = await waitFor(() => {
      const element = canvasElement.querySelector<HTMLElement>('.cm-content');
      if (!element) {
        throw new Error('Query editor content not found.');
      }
      return element;
    });

    // The placeholder renders inside the content element, so an empty document is not empty text.
    const doc = () => (content.querySelector('.cm-placeholder') ? '' : content.textContent);

    await waitFor(() => expect(doc()).toEqual('#test'));

    // No click and no `{End}`: `selectionEnd` is what puts the caret at the end of the document on
    // the first render, and the caret at the tag's own edge is still in the tag — so this single
    // Backspace both proves that and takes the whole chip.
    // `keyboard`, not `type`: the latter clicks the element first, which would move the caret.
    await userEvent.keyboard('{Backspace}');
    await waitFor(() => expect(doc()).toEqual(''));

    // Atomic does not mean uneditable: each character lands outside the replaced range and grows it,
    // so the tag is still typed a character at a time. The chip renders the label the whole way.
    await userEvent.keyboard('#te');
    await waitFor(() => expect(doc()).toEqual('#te '));
    await userEvent.keyboard('st');
    await waitFor(() => expect(doc()).toEqual('#test '));

    // Typed text is never glued to a chip, in either direction.
    await userEvent.keyboard('{Home}X');
    await waitFor(() => expect(doc()).toEqual('X #test '));
    await userEvent.keyboard('{End}Y');
    await waitFor(() => expect(doc()).toEqual('X #test Y '));

    // Two deletes for `X `, then a single one for the whole five-character tag.
    await userEvent.keyboard('{Home}{Delete}{Delete}{Delete}');
    await waitFor(() => expect(doc()).toEqual(' Y '));
  },
};
