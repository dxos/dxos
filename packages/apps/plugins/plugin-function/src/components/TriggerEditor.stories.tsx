//
// Copyright 2024 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { ChainPromptType } from '@braneframe/types';
import { create } from '@dxos/echo-schema';
import { FunctionDef, FunctionTrigger } from '@dxos/functions/types';
import { useClient } from '@dxos/react-client';
import { type Space } from '@dxos/react-client/echo';
import { ClientRepeater } from '@dxos/react-client/testing';
import { DensityProvider } from '@dxos/react-ui';
import { withTheme } from '@dxos/storybook-utils';

import { TriggerEditor } from './TriggerEditor';

const functions: Omit<FunctionDef, 'id'>[] = [
  {
    uri: 'dxos.org/function/email-worker',
    route: '/email-worker',
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

const useFunctionTrigger = (space: Space) => {
  const [trigger, setTrigger] = useState<FunctionTrigger>();

  useEffect(() => {
    const trigger = space.db.add(create(FunctionTrigger, { function: '', spec: { type: 'timer', cron: '0 0 * * *' } }));
    setTrigger(trigger);
  }, [space, setTrigger]);

  return trigger;
};

const TriggerEditorStory = () => {
  const client = useClient();
  const space = client.spaces.default;
  const trigger = useFunctionTrigger(space);

  useEffect(() => {
    for (const fn of functions) {
      space.db.add(create(FunctionDef, { ...fn }));
    }
  }, [space]);

  if (!trigger) {
    return null;
  }

  return (
    <DensityProvider density='fine'>
      <div role='none' className='is-full pli-8'>
        <TriggerEditor space={space} trigger={trigger} />
      </div>
    </DensityProvider>
  );
};

export default {
  title: 'plugin-chain/TriggerEditor',

  render: () => (
    <ClientRepeater
      component={TriggerEditorStory}
      schema={[FunctionTrigger, FunctionDef, ChainPromptType]}
      registerSignalFactory
      createIdentity
      createSpace
    />
  ),
  decorators: [withTheme],
};

export const Default = {};
