//
// Copyright 2026 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Schema from 'effect/Schema';
import React, { useMemo, useRef, useState } from 'react';

import { toJsonSchema } from '@dxos/echo/JsonSchema';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { json } from '@dxos/ui-editor';
import { trim } from '@dxos/util';

import { templateLanguage } from '../codemirror/index.ts';
import { type Node, TemplateParseError, parse, select } from '../index.ts';
import { Template, createReactRenderer } from './renderer.tsx';
import { Editor, OperationLog, Workbench } from './testing/index.ts';
import { type SequencedLogEntry } from './useSystem.ts';

//
// SPIKE story. Four columns, left to right: the type the template is parameterized by, an instance
// of it, the template, and the render. Editing the middle two re-renders the fourth, so the whole
// loop — schema, state, layout, output — is visible at once.
//

/**
 * The JSON Schema meta-schema, so the schema column is validated as a schema rather than merely as
 * JSON. Enough of draft-07 to catch a malformed type or a bad `properties` shape.
 */
const JSON_SCHEMA_META = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  properties: {
    $schema: { type: 'string' },
    type: { type: 'string' },
    title: { type: 'string' },
    description: { type: 'string' },
    properties: { type: 'object' },
    items: { type: 'object' },
    required: { type: 'array', items: { type: 'string' } },
    additionalProperties: { type: 'boolean' },
  },
} as const;

/** The context type. A template is parameterized by this (ONTOLOGY R-1). */
const ProjectState = Schema.Struct({
  title: Schema.String,
  description: Schema.String,
  tags: Schema.Array(Schema.String),
}).annotate({ title: 'ProjectState' });

type ProjectState = Schema.Schema.Type<typeof ProjectState>;

const initialState: ProjectState = {
  title: 'MOSAIC',
  description: 'Model-Oriented System for Adaptive Interface Composition.',
  tags: ['ontology', 'declarative-ui', 'spike'],
};

// Compile-time check that the typed path builder rejects a field the state does not have:
// `select<ProjectState>().missing` does not compile. Unused at runtime.
void select<ProjectState>().title;

const SIMPLE = trim`
  <container>
    <var name="title" type="org.dxos.type.Text" />
    <var name="description" type="org.dxos.type.Text" />
    <display variant="title" data-text="title" />
    <display data-text="description" />
  </container>
`;

const WITH_COLLECTION = trim`
  <container>
    <var name="title" type="org.dxos.type.Text" />
    <var name="description" type="org.dxos.type.Text" />
    <var name="tags" type="org.dxos.type.Text" many="true" />
    <display variant="title" data-text="title" />
    <display data-text="description" />
    <collection data-items="tags">
      <display item-text="." />
    </collection>
  </container>
`;

const WITH_EVENTS = trim`
  <container>
    <var name="title" type="org.dxos.type.Text" />
    <var name="tags" type="org.dxos.type.Text" many="true" />
    <display variant="title" data-text="title" />
    <control label="Name" data-value="title" on-commit="org.dxos.operation.projects.rename" />
    <collection data-items="tags">
      <display item-text="." />
    </collection>
    <command>
      <control as="button" label="Add tag" on-activate="org.dxos.operation.projects.addTag" />
      <control as="button" label="Open" on-activate="org.dxos.operation.layout.open" />
    </command>
  </container>
`;

const DefaultStory = ({ source: initialSource }: { source: string }) => {
  const renderer = useMemo(() => createReactRenderer({ schemas: {} }), []);
  const [source, setSource] = useState(initialSource);
  const [stateText, setStateText] = useState(() => JSON.stringify(initialState, null, 2));
  const [log, setLog] = useState<readonly SequencedLogEntry[]>([]);
  const seq = useRef(0);

  const schemaText = useMemo(() => JSON.stringify(toJsonSchema(ProjectState), null, 2), []);
  const jsonSchema = useMemo(() => toJsonSchema(ProjectState), []);

  const parsed = useMemo<{ node?: Node; error?: string }>(() => {
    try {
      return { node: parse(source) };
    } catch (err) {
      return { error: err instanceof TemplateParseError ? err.message : String(err) };
    }
  }, [source]);

  const state = useMemo<{ value?: ProjectState; error?: string }>(() => {
    try {
      // Decode, not merely parse: `null` or wrongly-typed fields must fail here, visibly, rather
      // than reach the renderer as a malformed context.
      return { value: Schema.decodeUnknownSync(ProjectState)(JSON.parse(stateText)) };
    } catch (err) {
      return { error: (err as Error).message };
    }
  }, [stateText]);

  const schemaExtensions = useMemo<Extension[]>(() => [json({ schema: JSON_SCHEMA_META })], []);
  const stateExtensions = useMemo<Extension[]>(() => [json({ schema: jsonSchema })], [jsonSchema]);
  const templateExtensions = useMemo<Extension[]>(() => templateLanguage(), []);

  return (
    <Workbench
      panes={[
        {
          title: 'Context schema',
          children: <Editor value={schemaText} extensions={schemaExtensions} />,
        },
        {
          title: 'Layout',
          children: <Editor value={source} extensions={templateExtensions} onChange={setSource} />,
        },
        {
          title: 'Context object',
          children: <Editor value={stateText} extensions={stateExtensions} onChange={setStateText} />,
        },
        {
          title: 'Log',
          children: <OperationLog entries={log} />,
        },
      ]}
      main={{
        title: 'Rendered',
        children:
          parsed.node && state.value ? (
            <Template
              node={parsed.node}
              vars={state.value}
              renderer={renderer}
              options={{
                dispatch: (operation, { payload }) =>
                  setLog((entries) => [{ operation, payload, seq: seq.current++ }, ...entries].slice(0, 8)),
              }}
            />
          ) : (
            <span className='text-error-text text-sm'>{parsed.error ?? state.error}</span>
          ),
      }}
    />
  );
};

const meta: Meta<typeof DefaultStory> = {
  title: 'ui/ui-template/Template',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Simple: Story = {
  args: {
    source: SIMPLE,
  },
};

export const Collection: Story = {
  args: {
    source: WITH_COLLECTION,
  },
};

export const Events: Story = {
  args: {
    source: WITH_EVENTS,
  },
};
