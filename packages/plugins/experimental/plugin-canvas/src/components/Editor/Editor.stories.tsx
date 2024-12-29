//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import type { Meta, StoryObj } from '@storybook/react';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { type ReactiveEchoObject } from '@dxos/echo-db';
import { S, getTypename } from '@dxos/echo-schema';
import { createGraph, GraphModel, type GraphNode } from '@dxos/graph';
import { faker } from '@dxos/random';
import { useClientProvider, withClientProvider } from '@dxos/react-client/testing';
import { withAttention } from '@dxos/react-ui-attention/testing';
import { Form, TupleInput } from '@dxos/react-ui-form';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { createObjectFactory, Testing, type TypeSpec, type ValueGenerator } from '@dxos/schema/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Editor, type EditorController, type EditorRootProps } from './Editor';
import { SelectionModel } from '../../hooks';
import { doLayout } from '../../layout';
import { RectangleShape, type Shape } from '../../types';
import { AttentionContainer } from '../AttentionContainer';

const generator: ValueGenerator = faker as any;

const types = [Testing.OrgType, Testing.ProjectType, Testing.ContactType];

// TODO(burdon): Ref expando breaks the form.
const RectangleShapeWithoutRef = S.omit<any, any, ['object']>('object')(RectangleShape);

type RenderProps = EditorRootProps & { init?: boolean; sidebar?: 'json' | 'selected' };

const Render = ({ id = 'test', graph: _graph, init, sidebar, ...props }: RenderProps) => {
  const editorRef = useRef<EditorController>(null);
  const { space } = useClientProvider();

  // Do layout.
  const [graph, setGraph] = useState<GraphModel<GraphNode<Shape>> | undefined>(_graph);
  useEffect(() => {
    if (!space || !init) {
      return;
    }

    const t = setTimeout(async () => {
      const { objects } = await space.db
        .query((object: ReactiveEchoObject<any>) => types.some((type) => type.typename === getTypename(object)))
        .run();

      const model = await doLayout(createGraph(objects));
      setGraph(model);
    });

    return () => clearTimeout(t);
  }, [space, init]);

  // Selection.
  const selection = useMemo(() => new SelectionModel(), []);
  const [selected, setSelected] = useState();
  useEffect(() => {
    return selection.selected.subscribe((selected) => {
      if (selection.size) {
        const [id] = selected.values();
        setSelected(graph?.getNode(id)?.data);
      } else {
        setSelected(undefined);
      }
    });
  }, [graph, selection]);

  return (
    <div className='grid grid-cols-[1fr,360px] w-full h-full'>
      <AttentionContainer id={id} classNames={['flex grow overflow-hidden', !sidebar && 'col-span-2']}>
        <Editor.Root ref={editorRef} id={id} graph={graph} selection={selection} autoZoom {...props}>
          <Editor.Canvas />
          <Editor.UI />
        </Editor.Root>
      </AttentionContainer>

      {/* TODO(burdon): Different types. */}
      {sidebar === 'selected' && selected && (
        <Form
          schema={RectangleShapeWithoutRef}
          values={selected}
          Custom={{
            // TODO(burdon): Replace by type.
            ['center' as const]: (props) => <TupleInput {...props} binding={['x', 'y']} />,
            ['size' as const]: (props) => <TupleInput {...props} binding={['width', 'height']} />,
          }}
        />
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
      onSpaceCreated: async ({ space }, { args: { spec } }) => {
        if (spec) {
          space.db.graph.schemaRegistry.addSchema(types);
          const createObjects = createObjectFactory(space.db, generator);
          await createObjects(spec as TypeSpec[]);
        }
      },
    }),
    withTheme,
    withAttention,
    withLayout({ fullscreen: true, tooltips: true }),
  ],
};

export default meta;

type Story = StoryObj<RenderProps & { spec?: TypeSpec[] }>;

export const Default: Story = {
  args: {
    debug: true,
    showGrid: true,
    snapToGrid: false,
    sidebar: 'json',
    graph: new GraphModel<GraphNode<Shape>>()
      .addNode({
        id: 'node-a',
        data: {
          id: 'node-a',
          type: 'function',
          properties: [],
          size: { width: 128, height: 128 },
          center: { x: -128, y: 0 },
        },
      })
      .addNode({
        id: 'node-b',
        data: {
          id: 'node-b',
          type: 'function',
          // TODO(burdon): Convert to schema.
          properties: [{ name: 'prop-1' }, { name: 'prop-2' }, { name: 'prop-3' }],
          size: { width: 128, height: 128 },
          center: { x: 128, y: 0 },
        },
      })
      .addEdge({
        id: 'node-a-to-node-b',
        source: 'node-a',
        target: 'node-b',
        data: { property: 'prop-2' },
      }),
  },
};

export const Json: Story = {
  args: {
    sidebar: 'json',
    init: true,
    spec: [
      { type: Testing.OrgType, count: 2 },
      { type: Testing.ContactType, count: 4 },
    ],
  },
};

export const Query: Story = {
  args: {
    sidebar: 'selected',
    init: true,
    spec: [
      { type: Testing.OrgType, count: 4 },
      { type: Testing.ProjectType, count: 0 },
      { type: Testing.ContactType, count: 16 },
    ],
  },
};
