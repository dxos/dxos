//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Schema from 'effect/Schema';
import React, { useMemo } from 'react';

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
