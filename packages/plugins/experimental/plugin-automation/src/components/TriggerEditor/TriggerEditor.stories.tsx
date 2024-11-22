//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react';
import React, { useEffect, useState } from 'react';

import { AST, S, create, toJsonSchema } from '@dxos/echo-schema';
import { FunctionTrigger, TriggerKind } from '@dxos/functions';
import { FunctionType } from '@dxos/plugin-script/types';
import { useSpaces } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { TriggerEditor } from './TriggerEditor';
import translations from '../../translations';
import { ChainPromptType } from '../../types';

// TODO(burdon): Extract type?
const functions = [
  {
    name: 'example.com/function/chess',
    version: 1,
    inputSchema: toJsonSchema(
      S.Struct({
        level: S.Number.annotations({
          [AST.TitleAnnotationId]: 'Level',
        }),
      }),
    ),
  },
  {
    name: 'example.com/function/forex',
    version: 1,
    binding: 'FOREX',
    inputSchema: toJsonSchema(
      S.Struct({
        from: S.String.annotations({
          [AST.TitleAnnotationId]: 'Currency from',
        }),
        to: S.String.annotations({
          [AST.TitleAnnotationId]: 'Currency to',
        }),
      }),
    ),
  },
];

const DefaultStory = () => {
  const spaces = useSpaces();
  const space = spaces[1];
  const [trigger, setTrigger] = useState<FunctionTrigger>();
  useEffect(() => {
    if (!space) {
      return;
    }

    const trigger = space.db.add(create(FunctionTrigger, { spec: { type: TriggerKind.Timer, cron: '' } }));
    setTrigger(trigger);
  }, [space]);

  if (!space || !trigger) {
    return <div />;
  }

  return (
    <div role='none' className='flex w-[350px] border border-separator overflow-hidden'>
      <TriggerEditor space={space} trigger={trigger} />
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
      types: [FunctionType, FunctionTrigger, ChainPromptType],
      onSpaceCreated: ({ space }) => {
        console.log(space.id);
        for (const fn of functions) {
          space.db.add(create(FunctionType, fn));
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
