//
// Copyright 2024 DXOS.org
//

import { type Meta } from '@storybook/react';
import React, { useEffect, useState } from 'react';

import { create } from '@dxos/echo-schema';
import { FunctionDef, FunctionTrigger } from '@dxos/functions/types';
import { useClient } from '@dxos/react-client';
import { withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { TriggerEditor } from './TriggerEditor';
import translations from '../../translations';
import { ChainPromptType } from '../../types';

const functions: Omit<FunctionDef, 'id'>[] = [
  {
    uri: 'dxos.org/function/email-worker',
    route: '/email',
    handler: 'email-worker',
    description: 'Email Sync',
  },
  {
    uri: 'dxos.org/function/gpt',
    route: '/gpt',
    handler: 'gpt',
    description: 'GPT Chat',
  },
];

const Story = () => {
  const [trigger, setTrigger] = useState<FunctionTrigger>();
  const client = useClient();
  const space = client.spaces.default;
  useEffect(() => {
    if (!space) {
      return;
    }

    const trigger = space.db.add(create(FunctionTrigger, { function: '', spec: { type: 'timer', cron: '0 0 * * *' } }));
    setTrigger(trigger);
  }, [space, setTrigger]);
  if (!space || !trigger) {
    return <div />;
  }

  return (
    <div role='none' className='flex w-[350px] border border-separator overflow-hidden'>
      <TriggerEditor space={space} trigger={trigger} />
    </div>
  );
};

export const Default = {};

const meta: Meta = {
  title: 'plugins/plugin-automation/TriggerEditor',
  component: TriggerEditor,
  render: Story,
  decorators: [
    withClientProvider({
      createIdentity: true,
      createSpace: true,
      types: [FunctionTrigger, FunctionDef, ChainPromptType],
      onSpaceCreated: ({ space }) => {
        for (const fn of functions) {
          space.db.add(create(FunctionDef, fn));
        }
      },
    }),
    withLayout({ fullscreen: true, classNames: 'flex justify-center m-2' }),
    withTheme,
  ],
  parameters: {
    translations,
  },
};

export default meta;
