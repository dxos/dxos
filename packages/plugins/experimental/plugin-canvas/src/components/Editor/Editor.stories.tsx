//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import type { Meta, StoryObj } from '@storybook/react';
import React, { useEffect, useRef, useState } from 'react';

import { type ReactiveEchoObject } from '@dxos/echo-db';
import { getTypename } from '@dxos/echo-schema';
import { faker } from '@dxos/random';
import { useSpaces } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { withAttention } from '@dxos/react-ui-attention/testing';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { mx } from '@dxos/react-ui-theme';
import { createObjectFactory, type ValueGenerator, Testing, type TypeSpec } from '@dxos/schema/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Editor, type EditorController, type EditorRootProps } from './Editor';
import { createGraph, type Graph } from '../../graph';
import { doLayout } from '../../layout';

const generator: ValueGenerator = faker as any;

const types = [Testing.OrgType, Testing.ProjectType, Testing.ContactType];

type RenderProps = EditorRootProps & { init?: boolean; sidebar?: boolean };

const Render = ({ id = 'test', init, sidebar, ...props }: RenderProps) => {
  const editorRef = useRef<EditorController>(null);
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

  useEffect(() => {
    if (graph) {
      void editorRef.current?.zoomToFit();
    }
  }, [graph]);

  return (
    <div className='grid grid-cols-[1fr,400px] w-full h-full'>
      <div className={mx('flex w-full h-full', !sidebar && 'col-span-2')}>
        <Editor.Root ref={editorRef} id={id} graph={graph} {...props}>
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
          { type: Testing.OrgType, count: 8 },
          { type: Testing.ProjectType, count: 0 },
          { type: Testing.ContactType, count: 16 },
        ];

        await createObjects(spec);
      },
    }),
    withTheme,
    withAttention,
    withLayout({ fullscreen: true }),
  ],
};

export default meta;

type Story = StoryObj<RenderProps>;

export const Default: Story = {
  args: {
    sidebar: false,
  },
};

export const Query: Story = {
  args: {
    sidebar: true,
    init: true,
  },
};
