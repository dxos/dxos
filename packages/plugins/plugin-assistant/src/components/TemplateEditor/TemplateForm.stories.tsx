//
// Copyright 2023 DXOS.org
//

import { type Meta } from '@storybook/react-vite';
import React, { useState } from 'react';

import { Blueprint, Template } from '@dxos/blueprints';
import { useClient } from '@dxos/react-client';
import { withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { trim } from '@dxos/util';

import { translations } from '../../translations';

import { TemplateForm } from './TemplateForm';

const TEMPLATE = trim`
  You are a machine that is an expert chess player.
  The move history of the current game is: {{history}}
  If asked to suggest a move explain why it is a good move.
  
  ---
 
  {{input}},
`;

const DefaultStory = () => {
  const client = useClient();
  const [blueprint] = useState(() => {
    const space = client.spaces.default;
    return space.db.add(
      Blueprint.make({
        key: 'example.com/blueprint/test',
        name: 'Test',
        instructions: Template.make({ source: TEMPLATE }),
      }),
    );
  });

  return (
    <div role='none' className='flex w-[40rem] border border-separator overflow-hidden'>
      <TemplateForm id={blueprint.id} template={blueprint.instructions} />
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-assistant/TemplateForm',
  component: TemplateForm,
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
} satisfies Meta<typeof TemplateForm>;

export default meta;

type Story = Meta<typeof TemplateForm>;

export const Default: Story = {};
