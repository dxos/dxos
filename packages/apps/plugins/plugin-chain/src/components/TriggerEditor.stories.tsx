//
// Copyright 2024 DXOS.org
//

import React, { useMemo } from 'react';

import { create } from '@dxos/echo-schema';
import { registerSignalRuntime } from '@dxos/echo-signals';
import { FunctionTrigger } from '@dxos/functions/types';
import { ClientRepeater } from '@dxos/react-client/testing';
import { DensityProvider } from '@dxos/react-ui';
import { withTheme } from '@dxos/storybook-utils';

import { TriggerEditor } from './TriggerEditor';

registerSignalRuntime();

const TriggerEditorStory = () => {
  const trigger = useMemo(() => {
    return create(FunctionTrigger, { function: '', spec: { type: 'timer', cron: '' } });
  }, []);

  return (
    <DensityProvider density='fine'>
      <div role='none' className='is-full pli-8'>
        <TriggerEditor trigger={trigger} />
      </div>
    </DensityProvider>
  );
};

export default {
  title: 'plugin-chain/TriggerEditor',
  // TODO(Zan): Client Repeater can register schemas
  render: () => <ClientRepeater component={TriggerEditorStory} createIdentity createSpace />,
  decorators: [withTheme],
};

export const Default = {};
