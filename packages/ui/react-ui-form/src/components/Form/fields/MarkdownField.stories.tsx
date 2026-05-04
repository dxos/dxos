//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Schema from 'effect/Schema';
import React, { useMemo } from 'react';
import { expect, userEvent } from 'storybook/test';

import { Filter, Format, Obj, Ref } from '@dxos/echo';
import { useQuery } from '@dxos/react-client/echo';
import { useClientStory, withClientProvider } from '@dxos/react-client/testing';
import { Panel } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';

import { translations } from '#translations';

import { TestLayout } from '../../testing';
import { Form } from '../Form';

//
// String-backed markdown.
//

const StringSchema = Schema.Struct({
  notes: Schema.String.pipe(Format.FormatAnnotation.set(Format.TypeFormat.Markdown)).annotations({ title: 'Notes' }),
});

const StringStory = () => (
  <TestLayout>
    <Form.Root schema={StringSchema} defaultValues={{ notes: '# Hello\n\nMarkdown text *here*.' }}>
      <Form.Viewport>
        <Form.Content>
          <Form.FieldSet />
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  </TestLayout>
);

//
// Ref<Text>-backed markdown.
//

const TextNoteHolder = Schema.Struct({
  instructions: Ref.Ref(Text.Text)
    .pipe(Format.FormatAnnotation.set(Format.TypeFormat.Markdown))
    .annotations({ title: 'Instructions' }),
});

const RefStory = () => {
  const { space } = useClientStory();
  const [text] = useQuery(space?.db, Filter.type(Text.Text));
  const values = useMemo(() => (text ? { instructions: Ref.make(text) } : undefined), [text]);

  if (!space || !values) {
    return null;
  }

  return (
    <TestLayout>
      <Panel.Root>
        <Panel.Content asChild>
          <Form.Root schema={TextNoteHolder} values={values as any} db={space.db}>
            <Form.Viewport>
              <Form.Content>
                <Form.FieldSet />
              </Form.Content>
            </Form.Viewport>
          </Form.Root>
        </Panel.Content>
      </Panel.Root>
    </TestLayout>
  );
};

//
// Ref<Text> empty — shows the create button.
//

const EmptyRefSchema = Schema.Struct({
  instructions: Schema.optional(
    Ref.Ref(Text.Text)
      .pipe(Format.FormatAnnotation.set(Format.TypeFormat.Markdown))
      .annotations({ title: 'Instructions' }),
  ),
});

const EmptyRefStory = () => {
  const { space } = useClientStory();
  if (!space) {
    return null;
  }

  return (
    <TestLayout>
      <Panel.Root>
        <Panel.Content asChild>
          <Form.Root schema={EmptyRefSchema} defaultValues={{}} db={space.db}>
            <Form.Viewport>
              <Form.Content>
                <Form.FieldSet />
              </Form.Content>
            </Form.Viewport>
          </Form.Root>
        </Panel.Content>
      </Panel.Root>
    </TestLayout>
  );
};

const meta = {
  title: 'ui/react-ui-form/MarkdownField',
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const StringBacked: Story = {
  render: () => <StringStory />,
};

// Regression test: keystrokes into a string-backed markdown field must not
// blur the editor. Previously the EditorView was destroyed and recreated on
// every change because `onChange` was a useTextEditor dep and form callbacks
// are unstable across renders.
export const StringBackedKeepsFocus: Story = {
  render: () => (
    <TestLayout>
      <Form.Root schema={StringSchema} defaultValues={{ notes: '' }}>
        <Form.Viewport>
          <Form.Content>
            <Form.FieldSet />
          </Form.Content>
        </Form.Viewport>
      </Form.Root>
    </TestLayout>
  ),
  play: async ({ canvasElement }) => {
    const waitFor = async <T,>(predicate: () => T | null | undefined, message: string): Promise<T> => {
      for (let attempt = 0; attempt < 50; attempt++) {
        const value = predicate();
        if (value) {
          return value;
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      throw new Error(message);
    };

    const editorRoot = await waitFor(
      () => canvasElement.querySelector<HTMLElement>('.cm-editor'),
      'CodeMirror editor root (.cm-editor) not found',
    );
    const editorContent = editorRoot.querySelector<HTMLElement>('.cm-content')!;
    await expect(editorContent).toBeVisible();

    // Focus editor and wait for focus to settle inside the editor root.
    editorContent.focus();
    await waitFor(
      () => (editorRoot.contains(document.activeElement) ? true : null),
      'Editor did not receive focus',
    );

    // Type several characters; focus must be preserved inside the editor root
    // after every keystroke. Regression: previously the EditorView was
    // destroyed and recreated on every change, which detached the focused
    // contentDOM and blurred the input.
    const phrase = 'hello world';
    for (const ch of phrase) {
      await userEvent.keyboard(ch);
      await expect(editorRoot.contains(document.activeElement)).toBe(true);
    }

    await expect(editorContent).toHaveTextContent(phrase);
  },
};

export const RefPopulated: Story = {
  render: () => <RefStory />,
  decorators: [
    withClientProvider({
      createIdentity: true,
      createSpace: true,
      types: [Text.Text],
      onCreateSpace: async ({ space }) => {
        space.db.add(Obj.make(Text.Text, { content: '# Magazine brief\n\nLong-form text describing what to gather.' }));
      },
    }),
  ],
};

export const RefEmpty: Story = {
  render: () => <EmptyRefStory />,
  decorators: [
    withClientProvider({
      createIdentity: true,
      createSpace: true,
      types: [Text.Text],
    }),
  ],
};
