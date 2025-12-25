//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Schema from 'effect/Schema';
import React, { type PropsWithChildren, useRef, useState } from 'react';

import { Filter, Obj, Type } from '@dxos/echo';
import { type Live } from '@dxos/live-object';
import { faker } from '@dxos/random';
import { useClientStory, withClientProvider } from '@dxos/react-client/testing';
import { useAsyncEffect } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';
import { withAttention } from '@dxos/react-ui-attention/testing';
import { Form, TupleField } from '@dxos/react-ui-form';
import { Json } from '@dxos/react-ui-syntax-highlighter';
import { createGraph } from '@dxos/schema';
import { TestSchema, type TypeSpec, type ValueGenerator, createObjectFactory } from '@dxos/schema/testing';

import { doLayout } from '../../layout';
import { Container, DragTest, useSelection } from '../../testing';
import { type CanvasGraphModel, RectangleShape } from '../../types';

import { Editor, type EditorController, type EditorRootProps } from './Editor';

const generator: ValueGenerator = faker as any;

const types = [TestSchema.Organization, TestSchema.Project, TestSchema.Person];

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
  const { space } = useClientStory();
  const [graph, setGraph] = useState<CanvasGraphModel | undefined>();

  // Layout.
  useAsyncEffect(async () => {
    if (!space || !init) {
      return;
    }

    // Load objects.
    const objects = await space.db.query(Filter.everything()).run();
    const model = await doLayout(
      createGraph(
        objects.filter((object: Live<any>) => types.some((type) => type.typename === Obj.getTypename(object))),
      ),
    );
    setGraph(model);
  }, [space, init]);

  // Selection.
  const [selection, selected] = useSelection(graph);

  return (
    <div className='grid grid-cols-[1fr,360px] is-full bs-full'>
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
            <Form.Root
              schema={RectangleShapeWithoutRef}
              values={selected}
              fieldMap={{
                // TODO(burdon): Replace by type.
                ['center' as const]: (props) => <TupleField {...props} binding={['x', 'y']} />,
                ['size' as const]: (props) => <TupleField {...props} binding={['width', 'height']} />,
              }}
            >
              <Form.Viewport>
                <Form.Content>
                  <Form.FieldSet />
                  <Form.Actions />
                </Form.Content>
              </Form.Viewport>
            </Form.Root>
          )}

          {sidebar === 'json' && <Json data={{ graph: graph?.graph }} classNames='text-xs' />}
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
              type: registeredSchema.find((s) => Type.getTypename(s) === Type.getTypename(schema.type)),
            }));
          } else {
            await space.db.graph.schemaRegistry.register(types);
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
    spec: [{ type: TestSchema.Organization, count: 1 }],
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
      { type: TestSchema.Organization, count: 4 },
      { type: TestSchema.Project, count: 0 },
      { type: TestSchema.Person, count: 16 },
    ],
  },
};
