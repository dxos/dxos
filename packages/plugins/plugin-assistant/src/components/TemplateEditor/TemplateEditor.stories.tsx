//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react';
import React, { useState } from 'react';

import { createSystemPrompt } from '@dxos/artifact';
import { live } from '@dxos/live-object';
import { useClient } from '@dxos/react-client';
import { withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { TemplateEditor, type TemplateEditorProps } from './TemplateEditor';
import translations from '../../translations';
import { TemplateType } from '../../types';

const TEMPLATE = [
  '{{! System Prompt }}',
  '',
  'You are a machine that is an expert chess player.',
  'The move history of the current game is: {{history}}',
  'If asked to suggest a move explain why it is a good move.',
  '',
  '{{#each artifacts}}',
  '- {{this}}',
  '{{/each}}',
  '',
  '---',
  '',
  '{{input}}',
  '',
].join('\n');

const DefaultStory = ({ text }: TemplateEditorProps & { text: string }) => {
  const client = useClient();
  const [template] = useState(() => {
    const space = client.spaces.default;
    return space.db.add(live(TemplateType, { source: text, kind: { include: 'manual' } }));
  });

  return (
    <div role='none' className='flex w-[40rem] border border-separator overflow-hidden'>
      <TemplateEditor template={template} />
    </div>
  );
};

const meta: Meta<typeof DefaultStory> = {
  title: 'plugins/plugin-assistant/TemplateEditor',
  component: TemplateEditor,
  render: DefaultStory,
  decorators: [
    withClientProvider({
      createIdentity: true,
      createSpace: true,
      types: [TemplateType],
    }),
    withLayout({ fullscreen: true, classNames: 'flex justify-center' }),
    withTheme,
  ],
  parameters: {
    translations,
  },
};

export default meta;

type Story = Meta<typeof DefaultStory>;

export const Default: Story = {
  args: {
    text: TEMPLATE,
  },
};

export const System: Story = {
  args: {
    text: createSystemPrompt(),
  },
};
