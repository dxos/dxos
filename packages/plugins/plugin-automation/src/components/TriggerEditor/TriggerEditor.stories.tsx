//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { Filter, Obj, Ref, Tag, Type } from '@dxos/echo';
import { Function, Trigger } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { faker } from '@dxos/random';
import { useQuery } from '@dxos/react-client/echo';
import { TestSchema, useClientStory, withClientProvider } from '@dxos/react-client/testing';
import { useAsyncEffect } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations as formTranslations } from '@dxos/react-ui-form';
import { Employer, Organization, Person, Project } from '@dxos/types';

import { functions } from '../../testing';
import { translations } from '../../translations';

import { TriggerEditor, type TriggerEditorProps } from './TriggerEditor';

const types = [
  // TODO(burdon): Get label from annotation.
  { value: Organization.Organization.typename, label: 'Organization' },
  { value: Person.Person.typename, label: 'Person' },
  { value: Type.getTypename(Project.Project), label: 'Project' },
  { value: Employer.Employer.typename, label: 'Employer' },
];

const DefaultStory = (props: Partial<TriggerEditorProps>) => {
  const { space } = useClientStory();
  const [trigger, setTrigger] = useState<Trigger.Trigger>();
  const tags = useQuery(space?.db, Filter.type(Tag.Tag));

  useAsyncEffect(async () => {
    if (!space) {
      return;
    }

    const functions = await space.db.query(Filter.type(Function.Function)).run();
    const fn = functions.find((fn) => fn.name === 'example.com/function/forex');
    invariant(fn);
    const trigger = space.db.add(
      Trigger.make({
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
    <TriggerEditor
      db={space.db}
      trigger={trigger}
      types={types}
      tags={tags}
      onSave={(values) => console.log('on save', values)}
      {...props}
    />
  );
};

const meta = {
  title: 'plugins/plugin-automation/TriggerEditor',
  component: TriggerEditor as any,
  render: DefaultStory,
  decorators: [
    withTheme,
    withLayout({ layout: 'column' }),
    withClientProvider({
      createIdentity: true,
      createSpace: true,
      types: [Tag.Tag, Function.Function, Trigger.Trigger, TestSchema.ContactType],
      onCreateSpace: ({ space }) => {
        // Tags.
        ['Important', 'Investor', 'New'].forEach((label) => {
          space.db.add(Tag.make({ label }));
        });

        // Functions.
        functions.forEach((fn) => {
          space.db.add(Function.make(fn));
        });

        // Objects.
        Array.from({ length: 10 }).map(() => {
          return space.db.add(
            Obj.make(TestSchema.ContactType, {
              name: faker.person.fullName(),
              identifiers: [],
            }),
          );
        });
      },
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations: [...formTranslations, ...translations],
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
