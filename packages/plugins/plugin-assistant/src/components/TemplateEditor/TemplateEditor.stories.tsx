//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { createSystemPrompt } from '@dxos/assistant';
import { Blueprint, Template } from '@dxos/blueprints';
import { useClient } from '@dxos/react-client';
import { withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { trim } from '@dxos/util';

import { translations } from '../../translations';

import { TemplateEditor, type TemplateEditorProps } from './TemplateEditor';

const FENCE = '```';

const TEMPLATE = trim`
  {{! System Prompt }}
  
  You are an expert chess player.
  The move history of the current game is: {{history}}.
  If asked to suggest a move explain why it is a good move.

  {{#each artifacts}}
    {{this}}
  {{/each}}

  Reponse in the format: <suggestion>SUGGESTION</suggestion>

  @dxn:queue:data:B6INSIBY3CBEF4M5VZRYBCMAHQMPYK5AJ:01K24XMVHSZHS97SG1VTVQDM5Z:01K24XPK464FSCKVQJAB2H662M

  ---

  ${FENCE}ts
  const x = 100;
  ${FENCE}

  {{input}}
`;

const DefaultStory = ({ source }: TemplateEditorProps & { source: string }) => {
  const client = useClient();
  const [blueprint] = useState(() => {
    const space = client.spaces.default;
    return space.db.add(
      Blueprint.make({
        key: 'example.com/blueprint/test',
        name: 'Test',
        instructions: Template.make({ source }),
      }),
    );
  });

  return (
    <TemplateEditor
      classNames='bg-baseSurface max-is-prose is-full'
      id={blueprint.id}
      template={blueprint.instructions}
    />
  );
};

const meta = {
  title: 'plugins/plugin-assistant/TemplateEditor',
  component: TemplateEditor as any,
  render: DefaultStory,
  decorators: [
    withTheme,
    withLayout({ container: 'column' }),
    withClientProvider({
      types: [Blueprint.Blueprint],
      createIdentity: true,
      createSpace: true,
    }),
  ],
  parameters: {
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

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
