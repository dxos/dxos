//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import type { Meta, StoryObj } from '@storybook/react';
import React, { type PropsWithChildren, useEffect, useRef, useState } from 'react';

import { type ComputeGraphNode, type ComputeEdge } from '@dxos/conductor';
import { type ReactiveEchoObject } from '@dxos/echo-db';
import { S, getSchemaTypename, getTypename } from '@dxos/echo-schema';
import { createGraph, type GraphEdge, type GraphModel, type GraphNode } from '@dxos/graph';
import { faker } from '@dxos/random';
import { useClientProvider, withClientProvider } from '@dxos/react-client/testing';
import { withAttention } from '@dxos/react-ui-attention/testing';
import { Form, TupleInput } from '@dxos/react-ui-form';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { createObjectFactory, Testing, type TypeSpec, type ValueGenerator } from '@dxos/schema/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Editor, type EditorController, type EditorRootProps } from './Editor';
import { doLayout } from '../../layout';
import { useSelection } from '../../testing';
import { RectangleShape, type Shape } from '../../types';
import { AttentionContainer } from '../AttentionContainer';
import { DragTest } from '../Canvas/DragTest';

const generator: ValueGenerator = faker as any;

const types = [Testing.OrgType, Testing.ProjectType, Testing.ContactType];

// TODO(burdon): Ref expando breaks the form.
const RectangleShapeWithoutRef = S.omit<any, any, ['object']>('object')(RectangleShape);

type RenderProps = EditorRootProps &
  PropsWithChildren<{
    init?: boolean;
    sidebar?: 'json' | 'selected' | 'state-machine';
    computeGraph?: GraphModel<GraphNode<ComputeGraphNode>, GraphEdge<ComputeEdge>>;
  }>;

const Render = ({ id = 'test', children, graph: _graph, init, sidebar, ...props }: RenderProps) => {
  const editorRef = useRef<EditorController>(null);
  const { space } = useClientProvider();
  const [graph, setGraph] = useState<GraphModel<GraphNode<Shape>> | undefined>(_graph);

  // Layout.
  useEffect(() => {
    if (!space || !init) {
      return;
    }

    // Load objects.
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
  const [selection, selected] = useSelection(graph);

  return (
    <div className='grid grid-cols-[1fr,360px] w-full h-full'>
      <AttentionContainer id={id} classNames={['flex grow overflow-hidden', !sidebar && 'col-span-2']}>
        <Editor.Root ref={editorRef} id={id} graph={graph} selection={selection} autoZoom {...props}>
          <Editor.Canvas>{children}</Editor.Canvas>
          <Editor.UI />
        </Editor.Root>
      </AttentionContainer>

      {/* TODO(burdon): Need to set schema based on what is selected. */}
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
            {JSON.stringify({ graph: graph?.graph }, null, 2)}
          </SyntaxHighlighter>
        </AttentionContainer>
      )}

      {sidebar === 'state-machine' && (
        <AttentionContainer id='sidebar' tabIndex={0} classNames='flex grow overflow-hidden'>
          <SyntaxHighlighter language='json' classNames='text-xs'>
            {JSON.stringify({ selected }, null, 2)}
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
      onSpaceCreated: async ({ space }, { args: { spec, registerSchema } }) => {
        if (spec) {
          if (registerSchema) {
            // Replace all schema in the spec with the registered schema.
            const registeredSchema = await space.db.schemaRegistry.register([
              ...new Set(spec.map((schema: any) => schema.type)),
            ] as S.Schema.AnyNoContext[]);

            spec = spec.map((schema: any) => ({
              ...schema,
              type: registeredSchema.find((s) => getSchemaTypename(s) === getSchemaTypename(schema.type)),
            }));
          } else {
            space.db.graph.schemaRegistry.addSchema(types);
          }

          const createObjects = createObjectFactory(space.db, generator);
          await createObjects(spec as TypeSpec[]);
          await space.db.flush({ indexes: true });
        }
      },
    }),
    withTheme,
    withAttention,
    withLayout({ fullscreen: true, tooltips: true }),
  ],
};

export default meta;

type Story = StoryObj<RenderProps & { spec?: TypeSpec[]; registerSchema?: boolean }>;

export const Default: Story = {
  args: {
    sidebar: 'json',
    init: true,
    spec: [{ type: Testing.OrgType, count: 1 }],
  },
};

export const Dragging: Story = {
  args: {
    sidebar: 'json',
    showGrid: false,
    snapToGrid: false,
    children: <DragTest />,
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
