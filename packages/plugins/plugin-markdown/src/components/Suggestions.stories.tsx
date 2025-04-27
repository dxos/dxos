//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react';
import React, { useMemo } from 'react';

import { IntentPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { createDocAccessor, createObject } from '@dxos/react-client/echo';
import { withAttention } from '@dxos/react-ui-attention/testing';
import { automerge, command, createRenderer, translations as editorTranslations, preview } from '@dxos/react-ui-editor';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { MarkdownEditor } from './MarkdownEditor';
import translations from '../translations';

const PreviewBlock = () => {
  return <div>PreviewBlock</div>;
};

const PreviewCard = () => {
  return <div>PreviewCard</div>;
};

const DefaultStory = () => {
  const doc = useMemo(() => createObject({ content: '# Test' }), []);
  const extensions = useMemo(
    () => [
      automerge(createDocAccessor(doc, ['content'])),
      command(),
      preview({
        renderBlock: createRenderer(PreviewBlock),
        renderPopover: createRenderer(PreviewCard),
        onLookup: async () => undefined,
      }),
    ],
    [doc],
  );

  return <MarkdownEditor id='test' initialValue={doc.content} extensions={extensions} toolbar />;
};

const meta: Meta<typeof MarkdownEditor> = {
  title: 'plugins/plugin-markdown/Suggestions',
  component: MarkdownEditor,
  render: DefaultStory,
  decorators: [
    withTheme,
    withLayout({ tooltips: true, fullscreen: true }),
    withAttention,
    withPluginManager({ plugins: [IntentPlugin()] }),
  ],
  parameters: {
    translations: [...translations, ...editorTranslations],
  },
};

export default meta;

export const Default = {
  args: {},
};
