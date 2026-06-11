//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Filter, Obj, Ref, Tag } from '@dxos/echo';
import { useQuery } from '@dxos/react-client/echo';
import { useClientStory, withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Person } from '@dxos/types';

import { translations } from '#translations';

import { ObjectForm } from './ObjectForm';

const DefaultStory = () => {
  const { space } = useClientStory();
  const [person] = useQuery(space?.db, Filter.type(Person.Person));
  if (!person) {
    return <></>;
  }

  return <ObjectForm object={person} type={Person.Person} />;
};

const meta = {
  title: 'ui/react-ui-form/ObjectForm',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'column', classNames: 'p-2', scroll: true }),
    withClientProvider({
      types: [Person.Person, Tag.Tag],
      createIdentity: true,
      createSpace: true,
      onCreateSpace: async ({ space }) => {
        const tag = space.db.add(Tag.make({ label: 'Friend', hue: 'emerald' }));
        const person = space.db.add(
          Obj.make(Person.Person, {
            fullName: 'Alice Carroll',
            jobTitle: 'Engineer',
            emails: [{ value: 'alice@example.com' }],
          }),
        );
        Obj.update(person, (person) => {
          Obj.getMeta(person).tags = [Ref.make(tag)];
        });
      },
    }),
  ],
  parameters: {
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
