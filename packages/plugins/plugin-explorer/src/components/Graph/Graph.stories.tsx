//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react';
import React, { useEffect, useState } from 'react';

import { createSpaceObjectGenerator, TestSchemaType } from '@dxos/echo-generator';
import { faker } from '@dxos/random';
import { useClient } from '@dxos/react-client';
import { live, Query } from '@dxos/react-client/echo';
import { type Space } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme, render } from '@dxos/storybook-utils';

import { Graph } from './Graph';
import { ViewType } from '../../types';
import { range } from '@dxos/util';
import { DataType } from '@dxos/schema';
import { RelationSourceId, RelationTargetId } from '@dxos/echo-schema';

faker.seed(1);

const DefaultStory = () => {
  const client = useClient();
  const [space, setSpace] = useState<Space>();
  const [view, setView] = useState<ViewType>();
  useEffect(() => {
    const space = client.spaces.default;
    const generator = createSpaceObjectGenerator(space);
    queueMicrotask(async () => {
      await generator.addSchemas();
      const objs = await generator.createObjects({
        [TestSchemaType.organization]: 10,
        [TestSchemaType.contact]: 30,
      });
      const orgs = objs.slice(0, 10);
      const contacts = objs.slice(10);

      // Add relations between objects.
      for (const n of range(10)) {
        await space.db.add(
          live(DataType.HasRelationship, {
            kind: 'friend',
            [RelationSourceId]: contacts[Math.floor(Math.random() * contacts.length)],
            [RelationTargetId]: contacts[Math.floor(Math.random() * contacts.length)],
          }),
        );
      }
    });

    const view = space.db.add(live(ViewType, { name: '', type: '' }));
    setSpace(space);
    setView(view);
  }, []);

  if (!space || !view) {
    return null;
  }

  return <Graph space={space} />;
};

const meta: Meta = {
  title: 'plugins/plugin-explorer/Graph',
  component: Graph,
  render: render(DefaultStory),
  decorators: [
    withClientProvider({ createSpace: true, types: [ViewType, DataType.HasRelationship] }),
    withTheme,
    withLayout({ fullscreen: true }),
  ],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

export const Default = {};
