//
// Copyright 2024 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { ChainPromptType } from '@braneframe/types';
import { create } from '@dxos/echo-schema';
import { FunctionDef, FunctionTrigger } from '@dxos/functions/types';
import { type PublicKey } from '@dxos/react-client';
import { useSpace } from '@dxos/react-client/echo';
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

// TODO(burdon): Get type form ClientRepeater.
const TriggerEditorStory = ({ spaceKey }: { spaceKey: PublicKey }) => {
  const [trigger, setTrigger] = useState<FunctionTrigger>();
  const space = useSpace(spaceKey);
  useEffect(() => {
    if (!space) {
      return;
    }

    const trigger = space.db.add(create(FunctionTrigger, { function: '', spec: { type: 'timer', cron: '0 0 * * *' } }));
    setTrigger(trigger);
  }, [space, setTrigger]);
  if (!space || !trigger) {
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
  title: 'plugin-function/TriggerEditor',

  render: () => (
    <ClientRepeater
      component={TriggerEditorStory}
      registerSignalFactory
      createIdentity
      createSpace
      types={[FunctionTrigger, FunctionDef, ChainPromptType]}
      onCreateSpace={(space) => {
        for (const fn of functions) {
          space.db.add(create(FunctionDef, fn));
        }
      }}
    />
  ),
  decorators: [withTheme],
};

export const Default = {};
