//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import * as Capability from '@dxos/app-framework/Capability';
import { withPluginManager } from '@dxos/app-framework/testing';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { type Database, Filter, Obj, Ref, Relation } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { ClientPlugin } from '@dxos/plugin-client/testing';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import { corePlugins } from '@dxos/plugin-testing';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import { useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout } from '@dxos/react-ui/testing';
import { HasRelationship, HasSubject, Message, Organization, Person, Task } from '@dxos/types';

import { translations } from '#translations';

import { RelatedArticle } from './RelatedArticle.tsx';

const SUBJECT_NAME = 'Alice Ashe';

const DefaultStory = () => {
  const spaces = useSpaces();
  const space = spaces[spaces.length - 1];
  const people = useQuery(space?.db, Filter.type(Person.Person));
  const subject = people.find((person) => person.fullName === SUBJECT_NAME);
  if (!subject) {
    return <Loading />;
  }

  return <RelatedArticle role='article' companionTo={subject} />;
};

/**
 * Seeds a subject related to four distinct types, so the toolbar has something to narrow: an
 * Organization by direct reference, and Persons/Tasks/Messages by relation in both directions.
 */
const createObjects = (db: Database.Database): void => {
  const organization = db.add(Obj.make(Organization.Organization, { name: 'Acme' }));
  const subject = db.add(Obj.make(Person.Person, { fullName: SUBJECT_NAME, organization: Ref.make(organization) }));

  for (const fullName of ['Bob Beech', 'Cleo Cedar', 'Dana Dogwood']) {
    const person = db.add(Obj.make(Person.Person, { fullName }));
    db.add(
      Relation.make(HasRelationship.HasRelationship, {
        [Relation.Source]: subject,
        [Relation.Target]: person,
        kind: 'colleague',
      }),
    );
  }

  for (const title of ['Review the proposal', 'Schedule the kickoff', 'Send the contract']) {
    const task = db.add(Obj.make(Task.Task, { title, status: 'todo' }));
    db.add(Relation.make(HasSubject.HasSubject, { [Relation.Source]: task, [Relation.Target]: subject }));
  }

  for (const text of ['Thanks for the intro.', 'Following up on last week.']) {
    const message = db.add(Message.make({ sender: { name: 'Bob Beech' }, blocks: [{ _tag: 'text', text }] }));
    db.add(Relation.make(HasSubject.HasSubject, { [Relation.Source]: message, [Relation.Target]: subject }));
  }
};

const meta = {
  title: 'plugins/plugin-space/containers/RelatedArticle',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      capabilities: [Capability.contribute(AppCapabilities.Translations, translations)],
      plugins: [
        ...corePlugins(),
        StorybookPlugin.make({}),
        PreviewPlugin.make(),
        ClientPlugin.make({
          types: [
            Organization.Organization,
            Person.Person,
            Task.Task,
            Message.Message,
            HasRelationship.HasRelationship,
            HasSubject.HasSubject,
          ],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* Effect.promise(() => client.halo.createIdentity());
              const space = yield* Effect.promise(() => client.spaces.create());
              yield* Effect.promise(() => space.waitUntilReady());
              createObjects(space.db);
              yield* Effect.promise(() => space.db.flush());
            }),
        }),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
