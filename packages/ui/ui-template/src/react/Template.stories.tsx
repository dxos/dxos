//
// Copyright 2026 DXOS.org
//

import { EditorView } from '@codemirror/view';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Schema from 'effect/Schema';
import React, { useMemo, useState } from 'react';

import { toJsonSchema } from '@dxos/echo/JsonSchema';
import { Flex, Panel, useThemeContext } from '@dxos/react-ui';
import { useTextEditor } from '@dxos/react-ui-editor';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { createBasicExtensions, createThemeExtensions, documentSlots, json } from '@dxos/ui-editor';
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

type ColumnProps = {
  title: string;
  children: React.ReactNode;
  /** Width in rem; the render column takes the remainder. */
  width?: string;
};

const Column = ({ title, children, width }: ColumnProps) => (
  <Flex column classNames={mx('min-w-0', width ? `${width} shrink-0` : 'flex-1')}>
    <div className='p-1 text-xs uppercase tracking-wide text-subdued border-be border-separator'>{title}</div>
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

  const schemaExtensions = useMemo(() => [json()], []);
  const stateExtensions = useMemo(() => [json({ schema: jsonSchema })], [jsonSchema]);
  const templateExtensions = useMemo(() => templateLanguage(), []);

  return (
    <Flex classNames='h-full w-full divide-x divide-separator' align='stretch'>
      <Column title='Context schema' width='w-80'>
        <ReadOnlyEditor value={schemaText} extensions={schemaExtensions} />
      </Column>

      <Column title='Context object' width='w-80'>
        <LiveEditor value={stateText} onChange={setStateText} extensions={stateExtensions} />
      </Column>

      <Column title='Layout' width='w-80'>
        <LiveEditor value={source} onChange={setSource} extensions={templateExtensions} />
      </Column>

      <Column title='Rendered'>
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
            <Panel.Root role='none' classNames='border border-subdued-separator rounded-sm'>
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
      </Column>
    </Flex>
  );
};

//
// Editors. Split into read-only and live variants because the live one needs an update listener,
// which has to be created with the view rather than passed as a prop.
//

const ReadOnlyEditor = ({ value, extensions }: { value: string; extensions: any[] }) => {
  const { themeMode } = useThemeContext();
  const { parentRef } = useTextEditor(
    () => ({
      initialValue: value,
      extensions: [
        createThemeExtensions({ themeMode, slots: documentSlots }),
        createBasicExtensions({ readOnly: true, lineWrapping: false }),
        ...extensions,
      ],
    }),
    [themeMode, value, extensions],
  );

  return <div ref={parentRef} className='flex-1 min-h-0 overflow-auto' />;
};

const LiveEditor = ({
  value,
  onChange,
  extensions,
}: {
  value: string;
  onChange: (value: string) => void;
  extensions: any[];
}) => {
  const { themeMode } = useThemeContext();
  const { parentRef } = useTextEditor(
    () => ({
      initialValue: value,
      extensions: [
        createThemeExtensions({ themeMode, slots: documentSlots }),
        createBasicExtensions({ lineWrapping: false }),
        ...extensions,
        mirrorTo(onChange),
      ],
    }),
    // Deliberately not keyed on `value`: the editor owns the text once mounted, and re-creating it
    // on every keystroke would lose the cursor.
    [themeMode, extensions],
  );

  return <div ref={parentRef} className='flex-1 min-h-0 overflow-auto' />;
};

/** Mirror the document out on change so the render column follows the editor. */
const mirrorTo = (onChange: (value: string) => void) =>
  EditorView.updateListener.of((update) => {
    if (update.docChanged) {
      onChange(update.state.doc.toString());
    }
  });

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
