//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react';
import React, { useEffect, useState } from 'react';

import { FunctionType, FunctionTrigger, TriggerKind } from '@dxos/functions/types';
import { live } from '@dxos/live-object';
import { useSpaces } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { TriggerEditor } from './TriggerEditor';
import { functions } from '../../testing';
import translations from '../../translations';

const DefaultStory = () => {
  const spaces = useSpaces();
  const space = spaces[1];
  const [trigger, setTrigger] = useState<FunctionTrigger>();
  useEffect(() => {
    if (!space) {
      return;
    }

    const trigger = space.db.add(live(FunctionTrigger, { spec: { type: TriggerKind.Timer, cron: '' } }));
    setTrigger(trigger);
  }, [space]);

  if (!space || !trigger) {
    return <div />;
  }

  return (
    <div role='none' className='w-[32rem] bs-fit border border-separator rounded-sm'>
      <TriggerEditor space={space} trigger={trigger} onSave={(values) => console.log('on save', values)} />
    </div>
  );
};

const meta: Meta = {
  title: 'plugins/plugin-automation/TriggerEditor',
  component: TriggerEditor,
  render: DefaultStory,
  decorators: [
    withClientProvider({
      createIdentity: true,
      createSpace: true,
      types: [FunctionType, FunctionTrigger],
      onSpaceCreated: ({ space }) => {
        for (const fn of functions) {
          space.db.add(live(FunctionType, fn));
        }
      },
    }),
    withLayout({ fullscreen: true, tooltips: true, classNames: 'flex justify-center m-2' }),
    withTheme,
  ],
  parameters: {
    translations,
  },
};

export default meta;

export const Default = {};
