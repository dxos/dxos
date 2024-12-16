//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';

import { type ReactiveEchoObject } from '@dxos/echo-db';
import { log } from '@dxos/log';
import { CollectionType } from '@dxos/plugin-space';
import { faker } from '@dxos/random';
import { useSpaces } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { useAsyncEffect } from '@dxos/react-ui';
import { createObjectFactory, type ValueGenerator, Testing, type TypeSpec } from '@dxos/schema/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Editor, type EditorRootProps } from './Editor';
import { mapObjects, type Graph, GraphModel } from '../../graph';
import { toLayoutGraph, doLayout, updateLayout } from '../../layout';

const generator: ValueGenerator = faker as any;

const Render = (props: EditorRootProps) => {
  const [graph, setGraph] = useState<Graph>();
  const [_, space] = useSpaces(); // TODO(burdon): Get created space.
  console.log(space);
  useAsyncEffect(async () => {
    if (!space) {
      return;
    }

    const { objects } = await space.db
      .query((object: ReactiveEchoObject<any>) => !(object instanceof CollectionType))
      .run();

    log.info('query', { objects: objects.length });
    const model = mapObjects(new GraphModel(), space, objects);
    const layout = await doLayout(toLayoutGraph(model.graph));
    updateLayout(model, layout);
    log.info('graph', { nodes: model.graph.nodes });
    setGraph(model.graph);
  }, [space]);

  return (
    <Editor.Root graph={graph} {...props}>
      <Editor.Canvas />
      <Editor.UI />
    </Editor.Root>
  );
};

const meta: Meta<EditorRootProps> = {
  title: 'plugins/plugin-canvas/Editor',
  component: Editor.Root,
  render: Render,
  decorators: [
    withClientProvider({
      createIdentity: true,
      createSpace: true,
      onSpaceCreated: async ({ space }) => {
        space.db.graph.schemaRegistry.addSchema([Testing.OrgType, Testing.ProjectType, Testing.ContactType]);
        const createObjects = createObjectFactory(space.db, generator);
        const spec: TypeSpec[] = [
          { type: Testing.OrgType, count: 5 },
          { type: Testing.ProjectType, count: 5 },
          { type: Testing.ContactType, count: 10 },
        ];

        await createObjects(spec);
      },
    }),
    withTheme,
    withLayout({ fullscreen: true }),
  ],
};

export default meta;

type Story = StoryObj<EditorRootProps>;

export const Default: Story = {
  args: {
    debug: true,
    scale: 1,
  },
};
