//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import type { Meta, StoryObj } from '@storybook/react';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { type ReactiveEchoObject } from '@dxos/echo-db';
import { S, getTypename } from '@dxos/echo-schema';
import { log } from '@dxos/log';
import { faker } from '@dxos/random';
import { useSpaces } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { withAttention } from '@dxos/react-ui-attention/testing';
import { Form } from '@dxos/react-ui-form';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { createObjectFactory, type ValueGenerator, Testing, type TypeSpec } from '@dxos/schema/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Editor, type EditorController, type EditorRootProps } from './Editor';
import { createGraph, type GraphModel, type Node } from '../../graph';
import { SelectionModel } from '../../hooks';
import { doLayout } from '../../layout';
import { RectangleShape, type Shape } from '../../types';
import { AttentionContainer } from '../AttentionContainer';

const generator: ValueGenerator = faker as any;

const types = [Testing.OrgType, Testing.ProjectType, Testing.ContactType];

type RenderProps = Omit<EditorRootProps, 'graph'> & { init?: boolean; sidebar?: 'json' | 'selected' };

// TODO(burdon): Ref expando breks the form.
const FixedRectangleShape = S.omit<any, any, ['object']>('object')(RectangleShape);

const Render = ({ id = 'test', init, sidebar, ...props }: RenderProps) => {
  const editorRef = useRef<EditorController>(null);
  const selection = useMemo(() => new SelectionModel(), []);
  const [graph, setGraph] = useState<GraphModel<Node<Shape>>>();
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
      setGraph(model);
    });

    return () => clearTimeout(t);
  }, [space, init]);

  useEffect(() => {
    if (graph) {
      requestAnimationFrame(() => {
        void editorRef.current?.zoomToFit();
      });
    }
  }, [graph]);

  // TODO(burdon): Get selected from graph.
  useEffect(() => {
    return selection.selected.subscribe((selected) => {
      log.info('selected', { ids: Array.from(selected.values()) });
    });
  }, [selection]);

  return (
    <div className='grid grid-cols-[1fr,360px] w-full h-full'>
      <AttentionContainer id={id} classNames={['flex grow overflow-hidden', !sidebar && 'col-span-2']}>
        <Editor.Root ref={editorRef} id={id} graph={graph} selection={selection} {...props}>
          <Editor.Canvas />
          <Editor.UI />
        </Editor.Root>
      </AttentionContainer>
      {sidebar === 'selected' && selection.selected.value.length > 0 && (
        <div>
          <Form
            schema={FixedRectangleShape}
            values={
              {
                id: 'test',
                type: 'rectangle',
                center: { x: 0, y: 0 },
                size: { width: 0, height: 0 },
                text: 'test',
              } satisfies RectangleShape
            }
          />
        </div>
      )}
      {sidebar === 'json' && (
        <AttentionContainer id='sidebar' tabIndex={0} classNames='flex grow overflow-hidden'>
          <SyntaxHighlighter language='json' classNames='text-xs'>
            {JSON.stringify({ graph }, null, 2)}
          </SyntaxHighlighter>
        </AttentionContainer>
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
          { type: Testing.OrgType, count: 1 },
          // { type: Testing.ProjectType, count: 0 },
          { type: Testing.ContactType, count: 3 },
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
    sidebar: 'selected',
    debug: true,
  },
};

export const Query: Story = {
  args: {
    sidebar: 'json',
    init: true,
  },
};
