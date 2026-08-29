//
// Copyright 2026 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Schema from 'effect/Schema';
import React, { useMemo, useState } from 'react';

import { toJsonSchema } from '@dxos/echo/JsonSchema';
import { Flex, Panel, ThemedClassName, useThemeContext } from '@dxos/react-ui';
import { useTextEditor } from '@dxos/react-ui-editor';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { compactSlots, createBasicExtensions, createThemeExtensions, json } from '@dxos/ui-editor';
import { mx } from '@dxos/ui-theme';
import { trim } from '@dxos/util';

import { templateLanguage } from '../codemirror';
import { type Node, TemplateParseError, parse, select } from '../index';
import { Template } from './renderer';

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
  <container gap="sm">
    <display variant="title" data-text="title" />
    <display data-text="description" />
  </container>
`;

const WITH_COLLECTION = trim`
  <container gap="sm">
    <display variant="title" data-text="title" />
    <display data-text="description" />
    <collection data-items="tags">
      <display item-text="." />
    </collection>
  </container>
`;

const WITH_EVENTS = trim`
  <container gap="sm">
    <layout direction="row" gap="sm" align="center">
      <display variant="title" data-text="title" />
    </layout>
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

/**
 * Named grid areas, so a cell's position is declared where it is rendered rather than inferred from
 * source order — moving a cell is an edit to one attribute.
 */
type Area = 'schema' | 'context' | 'template' | 'rendered';

const AREAS = `
  "schema   template"
  "context  rendered"
`;

type CellProps = ThemedClassName<{
  area: Area;
  title: string;
  children: React.ReactNode;
}>;

const Cell = ({ classNames, area, title, children }: CellProps) => (
  <Flex column style={{ gridArea: area }} classNames={mx('min-w-0', classNames)}>
    <div className='px-2 py-1 text-xs uppercase tracking-wide text-subdued border-be border-separator'>{title}</div>
    <Flex column grow classNames='min-h-0 overflow-hidden'>
      {children}
    </Flex>
  </Flex>
);

const DefaultStory = ({ source: initialSource }: { source: string }) => {
  const [source, setSource] = useState(initialSource);
  const [stateText, setStateText] = useState(() => JSON.stringify(initialState, null, 2));
  const [log, setLog] = useState<string[]>([]);

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
      return { value: JSON.parse(stateText) };
    } catch (err) {
      return { error: (err as Error).message };
    }
  }, [stateText]);

  const schemaExtensions = useMemo<Extension[]>(() => [json({ schema: JSON_SCHEMA_META })], []);
  const stateExtensions = useMemo<Extension[]>(() => [json({ schema: jsonSchema })], [jsonSchema]);
  const templateExtensions = useMemo<Extension[]>(() => templateLanguage(), []);

  return (
    <Flex
      style={{ gridTemplateAreas: AREAS }}
      classNames='dx-container grid grid-rows-2 grid-cols-2 divide-x divide-y divide-separator'
      align='stretch'
    >
      <Cell area='schema' title='Context schema'>
        <Editor value={schemaText} extensions={schemaExtensions} />
      </Cell>

      <Cell area='template' title='Layout'>
        <Editor value={source} extensions={templateExtensions} onChange={setSource} />
      </Cell>

      <Cell area='context' title='Context object'>
        <Editor value={stateText} extensions={stateExtensions} onChange={setStateText} />
      </Cell>

      <Cell area='rendered' title='Rendered'>
        <Flex column gap='md' classNames='overflow-auto'>
          {parsed.node && state.value ? (
            <Template
              node={parsed.node}
              state={state.value}
              options={{ dispatch: (operation) => setLog((entries) => [operation, ...entries].slice(0, 8)) }}
            />
          ) : (
            <span className='text-error-text text-sm'>{parsed.error ?? state.error}</span>
          )}

          {log.length > 0 && (
            <Panel.Root>
              <Panel.Content>
                <Flex column gap='xs'>
                  <span className='text-xs text-subdued'>dispatched</span>
                  {log.map((operation, index) => (
                    <span key={index} className='font-mono text-xs'>
                      {operation}
                    </span>
                  ))}
                </Flex>
              </Panel.Content>
            </Panel.Root>
          )}
        </Flex>
      </Cell>
    </Flex>
  );
};

//
// Editor.
//

/** Mirror the document out on change so the render column follows the editor. */
const mirrorTo = (onChange: (value: string) => void) =>
  EditorView.updateListener.of((update) => {
    if (update.docChanged) {
      onChange(update.state.doc.toString());
    }
  });

type EditorProps = {
  value: string;
  extensions: Extension[];
  /** Omit for a read-only column. */
  onChange?: (value: string) => void;
};

const Editor = ({ value, extensions, onChange }: EditorProps) => {
  const { themeMode } = useThemeContext();
  const { parentRef } = useTextEditor(
    () => ({
      initialValue: value,
      extensions: [
        createThemeExtensions({ themeMode, slots: compactSlots, syntaxHighlighting: true, monospace: true }),
        createBasicExtensions({ readOnly: !onChange, lineWrapping: false }),
        ...extensions,
        ...(onChange ? [mirrorTo(onChange)] : []),
      ],
    }),
    // An editable editor owns its text once mounted, so it must NOT key on `value` — recreating it
    // on every keystroke would lose the cursor. A read-only one has no such state, and keys on
    // `value` so an externally changed document is picked up.
    [themeMode, extensions, onChange, onChange ? null : value],
  );

  return <div ref={parentRef} className='flex-1 min-h-0 overflow-auto' />;
};

const meta: Meta<typeof DefaultStory> = {
  title: 'ui/ui-template/Template',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Simple: Story = { args: { source: SIMPLE } };
export const Collection: Story = { args: { source: WITH_COLLECTION } };
export const Events: Story = { args: { source: WITH_EVENTS } };
