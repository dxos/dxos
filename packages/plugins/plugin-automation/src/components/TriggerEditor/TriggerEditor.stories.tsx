//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { Filter, Obj, Ref, Tag, Type } from '@dxos/echo';
import { FunctionTrigger, FunctionType } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { faker } from '@dxos/random';
import { useQuery } from '@dxos/react-client/echo';
import { ContactType, useClientProvider, withClientProvider } from '@dxos/react-client/testing';
import { useAsyncEffect } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';
import { DataType } from '@dxos/schema';

import { functions } from '../../testing';
import { translations } from '../../translations';

import { TriggerEditor, type TriggerEditorProps } from './TriggerEditor';

const types = [
  // TODO(burdon): Get label from annotation.
  { value: Type.getTypename(DataType.Organization), label: 'Organization' },
  { value: Type.getTypename(DataType.Person), label: 'Person' },
  { value: Type.getTypename(DataType.Project), label: 'Project' },
  { value: Type.getTypename(DataType.Employer), label: 'Employer' },
];

const DefaultStory = (props: Partial<TriggerEditorProps>) => {
  const { space } = useClientProvider();
  const [trigger, setTrigger] = useState<FunctionTrigger>();
  const tags = useQuery(space, Filter.type(Tag.Tag));

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
      <TriggerEditor
        space={space}
        trigger={trigger}
        types={types}
        tags={tags}
        onSave={(values) => console.log('on save', values)}
        {...props}
      />
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
      types: [Tag.Tag, FunctionType, FunctionTrigger, ContactType],
      onCreateSpace: ({ space }) => {
        space.db.add(Tag.make({ label: 'Important' }));
        space.db.add(Tag.make({ label: 'Investor' }));
        space.db.add(Tag.make({ label: 'New' }));

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
