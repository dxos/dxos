//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import type { Meta, StoryObj } from '@storybook/react';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { type ReactiveEchoObject } from '@dxos/echo-db';
import { S, getTypename } from '@dxos/echo-schema';
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
  const [_, space] = useSpaces(); // TODO(burdon): Get created space.

  // Do layout.
  const [graph, setGraph] = useState<GraphModel<Node<Shape>>>();
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

  // selection.
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

  // TODO(burdon): Set option to do this automatically.
  useEffect(() => {
    if (graph) {
      requestAnimationFrame(() => {
        void editorRef.current?.zoomToFit();
      });
    }
  }, [graph]);

  return (
    <div className='grid grid-cols-[1fr,360px] w-full h-full'>
      <AttentionContainer id={id} classNames={['flex grow overflow-hidden', !sidebar && 'col-span-2']}>
        <Editor.Root ref={editorRef} id={id} graph={graph} selection={selection} {...props}>
          <Editor.Canvas />
          <Editor.UI />
        </Editor.Root>
      </AttentionContainer>
      {/* TODO(burdon): Autosave saves too early (before blur event). */}
      {sidebar === 'selected' && selected && <Form schema={FixedRectangleShape} values={selected} autoSave />}
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
    withLayout({ fullscreen: true, tooltips: true }),
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
    sidebar: 'selected',
    init: true,
  },
};
