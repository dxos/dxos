//
// Copyright 2025 DXOS.org
//
import '@dxos-theme';

import { type Decorator, type Meta, type StoryObj } from '@storybook/react-vite';
import * as Schema from 'effect/Schema';
import React, { useState } from 'react';

import * as Operation from '@dxos/compute/Operation';
import * as Trigger from '@dxos/compute/Trigger';
import { Blob, DXN, type Entity, Obj, Ref, Relation, Type } from '@dxos/echo';
import { random } from '@dxos/random';
import { useClientStory, withClientProvider } from '@dxos/react-client/testing';
import { translations as queryTranslations } from '@dxos/react-ui-query/translations';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { TestSchema } from '@dxos/schema/testing';

import { ObjectsTree, PropertyTree } from '../../../../components/index.ts';
import { DevtoolsContextProvider } from '../../../../hooks/index.ts';
import { ObjectsArticle } from './ObjectsArticle.tsx';

random.seed(1);

const withDevtoolsContext: Decorator = (Story) => (
  <DevtoolsContextProvider>
    <Story />
  </DevtoolsContextProvider>
);

const WorksAt = Type.makeRelation(DXN.make('com.example.story.worksAt', '0.1.0'))({
  source: TestSchema.Person,
  target: TestSchema.Organization,
})(
  Schema.Struct({
    role: Schema.optional(Schema.String),
  }),
);

const ObjectsPanelStory = () => {
  const { space } = useClientStory();
  return <ObjectsArticle space={space} />;
};

const SAMPLE_SVG = [
  '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="120" viewBox="0 0 200 120">',
  '<rect width="200" height="120" rx="12" fill="#3b82f6"/>',
  '<text x="100" y="68" font-size="24" text-anchor="middle" fill="white">blob</text>',
  '</svg>',
].join('');

const roles = ['Engineer', 'Designer', 'Manager', 'Director', 'Analyst'];

const meta = {
  title: 'devtools/devtools/ObjectsArticle',
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
        Operation.PersistentOperation,
        Trigger.Trigger,
        WorksAt,
        Blob.Blob,
      ],
      onCreateSpace: async ({ space }) => {
        const organizations = Array.from({ length: 5 }, () =>
          space.db.add(
            Obj.make(TestSchema.Organization, {
              name: random.company.name(),
              website: random.internet.url(),
            }),
          ),
        );

        const persons = Array.from({ length: 10 }, () =>
          space.db.add(
            Obj.make(TestSchema.Person, {
              name: random.person.fullName(),
              email: random.internet.email(),
              organization: Ref.make(random.helpers.arrayElement(organizations)),
            }),
          ),
        );

        const projects = Array.from({ length: 3 }, () =>
          space.db.add(
            Obj.make(TestSchema.Project, {
              name: random.commerce.productName(),
            }),
          ),
        );
        space.db.remove(projects[0]);

        const functions = Array.from({ length: 3 }, (_, index) =>
          space.db.add(
            Obj.make(Operation.PersistentOperation, {
              [Obj.Meta]: { version: '0.1.0' },
              name: `function-${index}`,
              description: random.lorem.sentence(),
            }),
          ),
        );

        // Triggers parented to their corresponding function.
        functions.forEach((fn) => {
          space.db.add(
            Obj.make(Trigger.Trigger, {
              [Obj.Parent]: fn,
              enabled: random.datatype.boolean(),
              spec: Trigger.specTimer('0 0 * * *'),
            }),
          );
        });

        // Additional child objects parented to projects.
        projects.forEach((project) => {
          Array.from({ length: 2 }, () =>
            space.db.add(
              Obj.make(TestSchema.Person, {
                [Obj.Parent]: project,
                name: random.person.fullName(),
                email: random.internet.email(),
              }),
            ),
          );
        });

        // Relations: persons employed at organizations.
        persons.forEach((person) => {
          const org = random.helpers.arrayElement(organizations);
          space.db.add(
            Relation.make(WorksAt, {
              [Relation.Source]: person,
              [Relation.Target]: org,
              role: random.helpers.arrayElement(roles),
            }),
          );
        });

        // Blobs, to exercise the content preview.
        const encoder = new TextEncoder();
        const blobs = [
          { type: 'image/svg+xml', text: SAMPLE_SVG },
          { type: 'application/json', text: JSON.stringify({ hello: 'world', items: [1, 2, 3] }, null, 2) },
        ];
        blobs.forEach(({ type, text }) => {
          const bytes = encoder.encode(text);
          space.db.add(Blob.make({ type, size: bytes.length, data: Blob.inlineData(bytes) }));
        });

        await space.db.flush();
      },
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations: queryTranslations,
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
      <div className='text-fg'>
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
          {selectedObject && <PropertyTree value={selectedObject} db={space.db} />}
        </div>
      </div>
    );
  },
};
