//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react';
import React, { useState } from 'react';

import { create } from '@dxos/live-object';
import { useClient } from '@dxos/react-client';
import { withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { TemplateEditor } from './TemplateEditor';
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

const Render = () => {
  const client = useClient();
  const [template] = useState(() => {
    const space = client.spaces.default;
    return space.db.add(create(TemplateType, { source: TEMPLATE }));
  });

  return (
    <div role='none' className='flex w-[30rem] border border-separator overflow-hidden'>
      <TemplateEditor template={template} />
    </div>
  );
};

const meta: Meta<typeof TemplateEditor> = {
  title: 'plugins/plugin-automation/TemplateEditor',
  component: TemplateEditor,
  render: Render,
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

type Story = Meta<typeof TemplateEditor>;

export const Default: Story = {};
