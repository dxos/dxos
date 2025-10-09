//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { Schema } from 'effect';
import React, { type PropsWithChildren, useRef, useState } from 'react';

import { Filter } from '@dxos/echo';
import { getSchemaTypename, getTypename } from '@dxos/echo/internal';
import { type Live } from '@dxos/live-object';
import { faker } from '@dxos/random';
import { useClientProvider, withClientProvider } from '@dxos/react-client/testing';
import { useAsyncEffect } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';
import { withAttention } from '@dxos/react-ui-attention/testing';
import { Form, TupleInput } from '@dxos/react-ui-form';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { createGraph } from '@dxos/schema';
import { Testing, type TypeSpec, type ValueGenerator, createObjectFactory } from '@dxos/schema/testing';

import { doLayout } from '../../layout';
import { Container, DragTest, useSelection } from '../../testing';
import { type CanvasGraphModel, RectangleShape } from '../../types';

import { Editor, type EditorController, type EditorRootProps } from './Editor';

const generator: ValueGenerator = faker as any;

const types = [Testing.Organization, Testing.Project, Testing.Contact];

// TODO(burdon): Ref expando breaks the form.
const RectangleShapeWithoutRef = Schema.omit<any, any, ['object']>('object')(RectangleShape);

type RenderProps = EditorRootProps &
  PropsWithChildren<{
    init?: boolean;
    sidebar?: 'json' | 'selected';
    computeGraph?: CanvasGraphModel;
  }>;

const DefaultStory = ({ id = 'test', init, sidebar, children, ...props }: RenderProps) => {
  const editorRef = useRef<EditorController>(null);
  const { space } = useClientProvider();
  const [graph, setGraph] = useState<CanvasGraphModel | undefined>();

  // Layout.
  useAsyncEffect(async () => {
    if (!space || !init) {
      return;
    }

    // Load objects.
    const { objects } = await space.db.query(Filter.everything()).run();
    const model = await doLayout(
      createGraph(objects.filter((object: Live<any>) => types.some((type) => type.typename === getTypename(object)))),
    );
    setGraph(model);
  }, [space, init]);

  // Selection.
  const [selection, selected] = useSelection(graph);

  return (
    <div className='grid grid-cols-[1fr,360px] w-full h-full'>
      <Container id={id} classNames={['flex grow overflow-hidden', !sidebar && 'col-span-2']}>
        <Editor.Root ref={editorRef} id={id} graph={graph} selection={selection} autoZoom {...props}>
          <Editor.Canvas>{children}</Editor.Canvas>
          <Editor.UI />
        </Editor.Root>
      </Container>

      {/* TODO(burdon): Need to set schema based on what is selected. */}
      {sidebar && (
        <Container id='sidebar' classNames='flex grow overflow-hidden'>
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
            <SyntaxHighlighter language='json' classNames='text-xs'>
              {JSON.stringify({ graph: graph?.graph }, null, 2)}
            </SyntaxHighlighter>
          )}
        </Container>
      )}
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-canvas-editor/Editor',
  component: Editor.Root as any,
  render: DefaultStory,
  decorators: [
    withTheme,
    withClientProvider({
      createIdentity: true,
      createSpace: true,
      onCreateSpace: async ({ space }, { args: { spec, registerSchema } }) => {
        if (spec) {
          if (registerSchema) {
            // Replace all schema in the spec with the registered schema.
            const registeredSchema = await space.db.schemaRegistry.register([
              ...new Set(spec.map((schema: any) => schema.type)),
            ] as Schema.Schema.AnyNoContext[]);

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
    withAttention,
  ],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    init: true,
    spec: [{ type: Testing.Organization, count: 1 }],
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
      { type: Testing.Organization, count: 4 },
      { type: Testing.Project, count: 0 },
      { type: Testing.Contact, count: 16 },
    ],
  },
};
