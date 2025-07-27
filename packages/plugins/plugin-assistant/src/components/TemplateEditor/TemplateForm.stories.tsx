//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react-vite';
import React, { useState } from 'react';

import { useClient } from '@dxos/react-client';
import { withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';
import { trim } from '@dxos/util';

import { TemplateForm } from './TemplateForm';
import { translations } from '../../translations';
import { Template } from '../../types';

const TEMPLATE = trim`
  You are a machine that is an expert chess player.
  The move history of the current game is: {{history}}
  If asked to suggest a move explain why it is a good move.
  
  ---
 
  {{input}},
`;

const DefaultStory = () => {
  const client = useClient();
  const [template] = useState(() => {
    const space = client.spaces.default;
    return space.db.add(Template.make({ source: TEMPLATE }));
  });

  return (
    <div role='none' className='flex w-[40rem] border border-separator overflow-hidden'>
      <TemplateForm template={template} />
    </div>
  );
};

const meta: Meta<typeof TemplateForm> = {
  title: 'plugins/plugin-assistant/TemplateForm',
  component: TemplateForm,
  render: DefaultStory,
  decorators: [
    withClientProvider({
      createIdentity: true,
      createSpace: true,
      types: [Template.Template],
    }),
    withLayout({ fullscreen: true, classNames: 'flex justify-center' }),
    withTheme,
  ],
  parameters: {
    translations,
  },
};

export default meta;

type Story = Meta<typeof TemplateForm>;

export const Default: Story = {};
