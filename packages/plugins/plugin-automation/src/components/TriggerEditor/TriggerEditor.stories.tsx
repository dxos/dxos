//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { Filter, Obj, Ref } from '@dxos/echo';
import { FunctionTrigger, FunctionType } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { faker } from '@dxos/random';
import { useSpaces } from '@dxos/react-client/echo';
import { ContactType, withClientProvider } from '@dxos/react-client/testing';
import { useAsyncEffect } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';

import { functions } from '../../testing';
import { translations } from '../../translations';

import { TriggerEditor, type TriggerEditorProps } from './TriggerEditor';

const DefaultStory = (props: Partial<TriggerEditorProps>) => {
  const spaces = useSpaces();
  const space = spaces[1];
  const [trigger, setTrigger] = useState<FunctionTrigger>();

  useAsyncEffect(async () => {
    if (!space) {
      return;
    }

    const result = await space.db.query(Filter.type(FunctionType)).run();
    const fn = result.objects.find((fn) => fn.name === 'example.com/function/forex');
    invariant(fn);
    const trigger = space.db.add(
      Obj.make(FunctionTrigger, {
        function: Ref.make(fn),
        spec: { kind: 'webhook' },
        input: {
          from: 'USD',
          to: 'JPY',
        },
      }),
    );
    setTrigger(trigger);
  }, [space]);

  if (!space || !trigger) {
    return <div />;
  }

  return (
    <div role='none' className='w-[32rem] bs-fit border border-separator rounded-sm'>
      <TriggerEditor space={space} trigger={trigger} onSave={(values) => console.log('on save', values)} {...props} />
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-automation/TriggerEditor',
  component: TriggerEditor as any,
  render: DefaultStory,
  decorators: [
    withTheme,
    withClientProvider({
      createIdentity: true,
      createSpace: true,
      types: [FunctionType, FunctionTrigger, ContactType],
      onCreateSpace: ({ space }) => {
        for (const fn of functions) {
          space.db.add(Obj.make(FunctionType, fn));
        }
        Array.from({ length: 10 }).map(() => {
          return space.db.add(
            Obj.make(ContactType, {
              name: faker.person.fullName(),
              identifiers: [],
            }),
          );
        });
      },
    }),
  ],
  parameters: {
    layout: 'column',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ReadonlySpec: Story = {
  args: {
    readonlySpec: true,
  },
};
