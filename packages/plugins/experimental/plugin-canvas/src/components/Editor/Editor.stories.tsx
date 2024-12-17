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
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { mx } from '@dxos/react-ui-theme/src';
import { createObjectFactory, type ValueGenerator, Testing, type TypeSpec } from '@dxos/schema/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Editor, type EditorRootProps } from './Editor';
import { createGraph, type Graph } from '../../graph';
import { doLayout } from '../../layout';

const generator: ValueGenerator = faker as any;

const types = [Testing.OrgType, Testing.ProjectType, Testing.ContactType];

type RenderProps = EditorRootProps & { init?: boolean; sidebar?: boolean };

const Render = ({ init, sidebar, ...props }: RenderProps) => {
  const [graph, setGraph] = useState<Graph>();
  const [_, space] = useSpaces(); // TODO(burdon): Get created space.
  useEffect(() => {
    if (!space || !init) {
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
  }, [space, init]);

  return (
    <div className='grid grid-cols-[1fr,400px] w-full h-full'>
      <div className={mx('flex w-full h-full', !sidebar && 'col-span-2')}>
        <Editor.Root graph={graph} {...props}>
          <Editor.Canvas />
          <Editor.UI />
        </Editor.Root>
      </div>
      {sidebar && (
        <SyntaxHighlighter language='json' classNames='text-xs'>
          {JSON.stringify({ graph }, null, 2)}
        </SyntaxHighlighter>
      )}
    </div>
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
          { type: Testing.OrgType, count: 4 },
          { type: Testing.ProjectType, count: 0 },
          { type: Testing.ContactType, count: 12 },
        ];

        await createObjects(spec);
      },
    }),
    withTheme,
    withLayout({ fullscreen: true }),
  ],
};

export default meta;

type Story = StoryObj<RenderProps>;

export const Default: Story = {
  args: {
    sidebar: true,
    init: true,
    id: 'test',
    debug: true,
    scale: 1,
  },
};
