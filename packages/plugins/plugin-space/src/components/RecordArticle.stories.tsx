//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Capabilities, contributes, createSurface } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Filter, Obj, Ref, Relation, type Type } from '@dxos/echo';
import { faker } from '@dxos/random';
import { useQuery } from '@dxos/react-client/echo';
import { useClientProvider, withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Card } from '@dxos/react-ui-stack';
import { Json } from '@dxos/react-ui-syntax-highlighter';
import { type ValueGenerator, createAsyncGenerator } from '@dxos/schema/testing';
import { translations as shellTranslations } from '@dxos/shell/react';
import { render } from '@dxos/storybook-utils';
import { Organization, Person, Task } from '@dxos/types';

import { translations } from '../translations';

import { RecordArticle } from './RecordArticle';

faker.seed(1);
const generator: ValueGenerator = faker as any;

const DefaultStory = () => {
  const { space } = useClientProvider();
  const [object] = useQuery(space, Filter.type(Organization.Organization));
  if (!object) {
    return null;
  }

  return <RecordArticle object={object} />;
};

const meta = {
  title: 'plugins/plugin-space/RecordArticle',
  component: RecordArticle as any,
  render: render(DefaultStory),
  decorators: [
    withTheme, // TODO(wittjosiah): Try to write story which does not depend on plugin manager.
    withLayout({ container: 'column' }),
    withPluginManager({
      capabilities: [
        contributes(Capabilities.ReactSurface, [
          createSurface({
            id: 'section',
            role: 'section',
            component: ({ data }) => (
              <Card.SurfaceRoot>
                <Json data={data} />
              </Card.SurfaceRoot>
            ),
          }),
          createSurface({
            id: 'card',
            role: 'card',
            component: ({ data }) => (
              <Card.SurfaceRoot>
                <Json data={data} />
              </Card.SurfaceRoot>
            ),
          }),
        ]),
      ],
    }),
    withClientProvider({
      createIdentity: true,
      createSpace: true,
      types: [Organization.Organization, Person.Person, Task.Task, HasSubject.HasSubject],
      onCreateSpace: async ({ space }) => {
        const org = space.db.add(
          Obj.make(Organization.Organization, {
            name: 'DXOS',
          }),
        );
        const task = space.db.add(
          Obj.make(Task.Task, {
            title: 'Task',
          }),
        );
        space.db.add(
          Relation.make(HasSubject.HasSubject, {
            [Relation.Source]: task,
            [Relation.Target]: org,
            completedAt: new Date().toISOString(),
          }),
        );
        const objectGenerator = createAsyncGenerator(generator, Person.Person as Type.Obj.Any, {
          db: space?.db,
          force: true,
        });
        await objectGenerator.createObjects(3).then((objects) => {
          objects.forEach((object) => {
            object.organization = Ref.make(org);
          });
        });
      },
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations: [...translations, ...shellTranslations],
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
