//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react';
import React, { useMemo } from 'react';

import { IntentProvider, type AnyIntentChain, type IntentContext } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { todo } from '@dxos/debug';
import { createDocAccessor, createObject, create } from '@dxos/react-client/echo';
import { Main } from '@dxos/react-ui';
import { AttendableContainer } from '@dxos/react-ui-attention';
import { withAttention } from '@dxos/react-ui-attention/testing';
import { editorWithToolbarLayout, automerge, translations as editorTranslations } from '@dxos/react-ui-editor';
import { topbarBlockPaddingStart } from '@dxos/react-ui-theme';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { MarkdownEditor, type MarkdownEditorProps } from './MarkdownEditor';
import translations from '../translations';

const content = Array.from({ length: 100 })
  .map((_, i) => `Line ${i + 1}`)
  .join('\n');

type StoryProps = MarkdownEditorProps & {
  content?: string;
  toolbar?: boolean;
};

const storybookIntentValue = create<IntentContext>({
  dispatch: () => todo(),
  dispatchPromise: async (intentChain: AnyIntentChain): Promise<any> => {
    console.log('[dispatch promise]', intentChain);
  },
  undo: () => todo(),
  undoPromise: () => todo(),
});

const DefaultStory = ({ content = '# Test', toolbar }: StoryProps) => {
  const doc = useMemo(() => createObject({ content }), [content]);
  const extensions = useMemo(() => [automerge(createDocAccessor(doc, ['content']))], [doc]);

  return (
    <IntentProvider value={storybookIntentValue}>
      <Main.Content
        bounce
        data-toolbar={toolbar ? 'enabled' : 'disabled'}
        classNames={[topbarBlockPaddingStart, editorWithToolbarLayout]}
      >
        <AttendableContainer id='test'>
          <MarkdownEditor id='test' initialValue={doc.content} extensions={extensions} toolbar={toolbar} />
        </AttendableContainer>
      </Main.Content>
    </IntentProvider>
  );
};

export const Default = {
  args: {
    content,
  },
};

export const WithToolbar = {
  args: {
    content,
    toolbar: true,
  },
};

const meta: Meta<typeof MarkdownEditor> = {
  title: 'plugins/plugin-markdown/EditorMain',
  component: MarkdownEditor,
  render: DefaultStory,
  decorators: [withTheme, withLayout({ tooltips: true }), withAttention, withPluginManager()],
  parameters: { layout: 'fullscreen', translations: [...translations, ...editorTranslations] },
};

export default meta;
