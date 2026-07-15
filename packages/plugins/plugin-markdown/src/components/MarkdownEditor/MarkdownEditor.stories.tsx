//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { createObject } from '@dxos/echo-client';
import { random } from '@dxos/random';
import { Panel } from '@dxos/react-ui';
import { AttendableContainer } from '@dxos/react-ui-attention';
import { withAttention } from '@dxos/react-ui-attention/testing';
import { Editor } from '@dxos/react-ui-editor';
import { translations as editorTranslations } from '@dxos/react-ui-editor/translations';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';

import { translations } from '#translations';
import { Markdown } from '#types';

import {
  MarkdownEditor,
  type MarkdownEditorEditorRootProps,
  MarkdownEditorProvider,
  type MarkdownEditorProviderProps,
} from './MarkdownEditor';

random.seed(1);

const CONTENT = [
  '# Markdown editor',
  '',
  '> Edit any column and watch the others update.',
  '',
  'Renders **markdown** formatting inline, or as raw *source*.',
  '',
  '## Section One',
  '',
  'Bound to a raw `Text` object (no client or database); every column shares the same object.',
  '',
  '- First item',
  '- Second item',
  '- Third item',
  '',
  '## Section Two',
  '',
  Array.from({ length: 3 })
    .map(() => random.lorem.paragraphs())
    .join('\n\n'),
  '',
].join('\n');

// Per-column editor config; the column's view mode is taken from `defaultViewMode`.
type StoryArgs = {
  columns: Markdown.Settings[];
};

const EditorArticle = (props: MarkdownEditorEditorRootProps) => (
  <Editor.Root {...props}>
    <Panel.Root role='article'>
      <Panel.Toolbar>
        <MarkdownEditor.Toolbar classNames='dx-document' />
      </Panel.Toolbar>
      <Panel.Content>
        <MarkdownEditor.Content />
        <MarkdownEditor.Blocks />
      </Panel.Content>
    </Panel.Root>
  </Editor.Root>
);

const EditorColumn = ({ id, object, settings }: Pick<MarkdownEditorProviderProps, 'id' | 'object' | 'settings'>) => (
  <AttendableContainer id={id} tabIndex={0} classNames='dx-container'>
    <MarkdownEditorProvider
      id={id}
      attendableId={id}
      object={object}
      viewMode={settings?.defaultViewMode}
      settings={settings}
    >
      {(editorRootProps) => <EditorArticle {...editorRootProps} />}
    </MarkdownEditorProvider>
  </AttendableContainer>
);

// Renders one column per config; all columns bind to the same raw ECHO object, so edits sync live via automerge.
const DefaultStory = ({ columns }: StoryArgs) => {
  // An automerge-backed ECHO object created without a client or database.
  const object = useMemo(() => createObject(Text.make({ content: CONTENT })), []);

  return (
    <div className='dx-container grid' style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}>
      {columns.map((settings, index) => (
        <EditorColumn key={index} id={`${object.id}/${index}`} object={object} settings={settings} />
      ))}
    </div>
  );
};

const meta: Meta<typeof DefaultStory> = {
  title: 'plugins/plugin-markdown/components/MarkdownEditor',
  render: DefaultStory,
  decorators: [withTheme()],
  parameters: {
    translations: [...translations, ...editorTranslations],
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  decorators: [withLayout({ layout: 'column' }), withAttention()],
  args: {
    columns: [
      {
        defaultViewMode: 'preview',
      },
    ],
  },
};

export const TwoColumn: Story = {
  decorators: [withLayout({ layout: 'fullscreen' }), withAttention()],
  args: {
    columns: [
      {
        defaultViewMode: 'preview',
        numberedHeadings: true,
      },
      {
        defaultViewMode: 'source',
      },
    ],
  },
};
