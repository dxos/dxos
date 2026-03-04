//
// Copyright 2025 DXOS.org
//
import '@dxos-theme';

import { type Decorator, type Meta, type StoryObj } from '@storybook/react-vite';
import * as Schema from 'effect/Schema';
import React, { useState } from 'react';

import { type Entity, Obj, Relation, Type } from '@dxos/echo';
import { Function, Trigger } from '@dxos/functions';
import { faker } from '@dxos/random';
import { useClientStory, withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { TestSchema } from '@dxos/schema/testing';

import { DevtoolsContextProvider } from '../hooks';

import { ObjectsTree } from './ObjectsTree';
import { ObjectViewer } from './ObjectViewer';

faker.seed(1);

const withDevtoolsContext: Decorator = (Story) => (
  <DevtoolsContextProvider>
    <Story />
  </DevtoolsContextProvider>
);

const WorksAt = Schema.Struct({
  role: Schema.optional(Schema.String),
}).pipe(
  Type.relation({
    typename: 'example.com/story/WorksAt',
    version: '0.1.0',
    source: TestSchema.Person,
    target: TestSchema.Organization,
  }),
);

const ObjectsPanelStory = () => {
  const { space } = useClientStory();
  if (!space) {
    return <div>No space</div>;
  }
  return <ObjectsTree db={space.db} />;
};

const roles = ['Engineer', 'Designer', 'Manager', 'Director', 'Analyst'];

const meta = {
  title: 'devtools/devtools/ObjectsTree',
  render: ObjectsPanelStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    withDevtoolsContext,
    withClientProvider({
      createIdentity: true,
      createSpace: true,
      types: [
        TestSchema.Organization,
        TestSchema.Person,
        TestSchema.Project,
        Function.Function,
        Trigger.Trigger,
        WorksAt,
      ],
      onCreateSpace: async ({ space }) => {
        const organizations = Array.from({ length: 5 }, () =>
          space.db.add(
            Obj.make(TestSchema.Organization, {
              name: faker.company.name(),
              website: faker.internet.url(),
            }),
          ),
        );

        const persons = Array.from({ length: 10 }, () =>
          space.db.add(
            Obj.make(TestSchema.Person, {
              name: faker.person.fullName(),
              email: faker.internet.email(),
            }),
          ),
        );

        const projects = Array.from({ length: 3 }, () =>
          space.db.add(
            Obj.make(TestSchema.Project, {
              name: faker.commerce.productName(),
            }),
          ),
        );
        space.db.remove(projects[0]);

        const functions = Array.from({ length: 3 }, (_, index) =>
          space.db.add(
            Function.make({
              name: `function-${index}`,
              version: '0.1.0',
              description: faker.lorem.sentence(),
            }),
          ),
        );

        // Triggers parented to their corresponding function.
        functions.forEach((fn) => {
          space.db.add(
            Obj.make(Trigger.Trigger, {
              [Obj.Parent]: fn,
              enabled: faker.datatype.boolean(),
              spec: { kind: 'timer', cron: '0 0 * * *' },
            }),
          );
        });

        // Additional child objects parented to projects.
        projects.forEach((project) => {
          Array.from({ length: 2 }, () =>
            space.db.add(
              Obj.make(TestSchema.Person, {
                [Obj.Parent]: project,
                name: faker.person.fullName(),
                email: faker.internet.email(),
              }),
            ),
          );
        });

        // Relations: persons employed at organizations.
        persons.forEach((person) => {
          const org = faker.helpers.arrayElement(organizations);
          space.db.add(
            Relation.make(WorksAt, {
              [Relation.Source]: person,
              [Relation.Target]: org,
              role: faker.helpers.arrayElement(roles),
            }),
          );
        });

        await space.db.flush();
      },
    }),
  ],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithTree: Story = {
  render: () => {
    const { space } = useClientStory();
    if (!space) {
      return <div>No space</div>;
    }
    return (
      <div className='text-base-surface-text'>
        <ObjectsTree db={space.db} />
      </div>
    );
  },
};

export const WithDetails: Story = {
  render: () => {
    const { space } = useClientStory();
    if (!space) {
      return <div>No space</div>;
    }
    const [selectedObject, setSelectedObject] = useState<Entity.Snapshot | null>(null);
    return (
      <div className='flex grid grid-rows_[1fr_1fr]'>
        <ObjectsTree db={space.db} onSelect={setSelectedObject} />
        <div className='border-separator! border-s border-t'>
          {selectedObject && <ObjectViewer object={selectedObject} id={selectedObject.id} />}
        </div>
      </div>
    );
  },
};
