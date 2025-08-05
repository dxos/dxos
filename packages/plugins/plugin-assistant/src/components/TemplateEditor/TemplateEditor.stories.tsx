//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react-vite';
import React, { useState } from 'react';

import { createSystemPrompt } from '@dxos/assistant';
import { Blueprint, Template } from '@dxos/blueprints';
import { useClient } from '@dxos/react-client';
import { withClientProvider } from '@dxos/react-client/testing';
import { ColumnContainer, withLayout, withTheme } from '@dxos/storybook-utils';
import { trim } from '@dxos/util';

import { translations } from '../../translations';

import { TemplateEditor, type TemplateEditorProps } from './TemplateEditor';

const TEMPLATE = trim`
  {{! System Prompt }}
  
  You are a machine that is an expert chess player.
  The move history of the current game is: {{history}}
  If asked to suggest a move explain why it is a good move.

  {{#each artifacts}}
  - {{this}}
  {{/each}}

  ---

  {{input}}
`;

const DefaultStory = ({ source }: TemplateEditorProps & { source: string }) => {
  const client = useClient();
  const [blueprint] = useState(() => {
    const space = client.spaces.default;
    return space.db.add(Blueprint.make({ key: 'example.com/blueprint/test', name: 'Test', instructions: { source } }));
  });

  return <TemplateEditor id={blueprint.id} template={blueprint.instructions} />;
};

const meta: Meta<typeof DefaultStory> = {
  title: 'plugins/plugin-assistant/TemplateEditor',
  component: TemplateEditor,
  render: DefaultStory,
  decorators: [
    withClientProvider({
      createIdentity: true,
      createSpace: true,
      types: [Template.Template],
    }),
    withLayout({ fullscreen: true, Container: ColumnContainer }),
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
    source: TEMPLATE,
  },
};

export const System: Story = {
  args: {
    source: createSystemPrompt({}),
  },
};
