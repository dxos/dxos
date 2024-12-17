//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import type { Meta, StoryObj } from '@storybook/react';
import React, { useEffect, useState } from 'react';

import { type ReactiveEchoObject } from '@dxos/echo-db';
import { getTypename } from '@dxos/echo-schema';
import { faker } from '@dxos/random';
import { useSpaces } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { createObjectFactory, type ValueGenerator, Testing, type TypeSpec } from '@dxos/schema/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Editor, type EditorRootProps } from './Editor';
import { createGraph, type Graph } from '../../graph';
import { doLayout } from '../../layout';

const generator: ValueGenerator = faker as any;

const types = [Testing.OrgType, Testing.ProjectType, Testing.ContactType];

const Render = (props: EditorRootProps) => {
  const [graph, setGraph] = useState<Graph>();
  const [_, space] = useSpaces(); // TODO(burdon): Get created space.
  useEffect(() => {
    if (!space) {
      return;
    }

    const t = setTimeout(async () => {
      const { objects } = await space.db
        .query((object: ReactiveEchoObject<any>) => types.some((t) => t.typename === getTypename(object)))
        .run();

      const model = await doLayout(createGraph(objects));
      setGraph(model.graph);
    });

    return () => clearTimeout(t);
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
        space.db.graph.schemaRegistry.addSchema(types);
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
    id: 'test',
    // debug: true,
    // scale: 1,
  },
};
