//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React from 'react';

import { Format } from '@dxos/echo';
import { IconButton, Panel, type ThemedClassName, Toolbar } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

// Default SPARQL: every fact. Parsed to a structured query and run over the store (no Comunica).
export const DEFAULT_SPARQL = 'SELECT ?fact ?p ?o WHERE { ?fact ?p ?o }';

const QueryOptions = Schema.Struct({
  question: Schema.String.annotations({ title: 'Query' }),
  query: Schema.String.pipe(
    Format.FormatAnnotation.set(Format.TypeFormat.Markdown),
    Schema.annotations({ title: 'SPARQL' }),
  ),
});

export type QueryPanelProps = ThemedClassName<{
  /** Natural-language question; Generate translates it into the SPARQL field. */
  question: string;
  query: string;
  busy?: boolean;
  onQuestionChange: (question: string) => void;
  onQueryChange: (query: string) => void;
  onGenerate: () => void;
  onRun: () => void;
  /** Restore the default query and clear the filter on the facts view (show all facts). */
  onReset: () => void;
}>;

/**
 * Query column: a plain-language question field and a Markdown SPARQL field. Generate translates the
 * question into SPARQL (LLM) and writes it into the SPARQL field; Run parses that SPARQL into a
 * structured query and executes it over the store (no Comunica in the browser). Pure/presentational —
 * the parent owns both strings and the handlers.
 */
export const QueryPanel = ({
  question,
  query,
  busy,
  onQuestionChange,
  onQueryChange,
  onGenerate,
  onRun,
  onReset,
  classNames,
}: QueryPanelProps) => (
  <Panel.Root classNames={classNames}>
    <Panel.Toolbar asChild>
      <Toolbar.Root>
        <Toolbar.Text classNames='grow'>Query</Toolbar.Text>
        <Toolbar.Separator />
        <IconButton
          icon='ph--sparkle--regular'
          iconOnly
          label='Generate SPARQL'
          disabled={!!busy || !question}
          onClick={onGenerate}
        />
        <IconButton icon='ph--play--regular' iconOnly label='Run' disabled={!!busy || !query} onClick={onRun} />
        <IconButton
          icon='ph--arrow-counter-clockwise--regular'
          iconOnly
          label='Reset query'
          disabled={!!busy}
          onClick={onReset}
        />
      </Toolbar.Root>
    </Panel.Toolbar>
    <Panel.Content classNames='dx-container'>
      <Form.Root
        schema={QueryOptions}
        values={{ question, query }}
        onValuesChanged={(values) => {
          onQuestionChange(values.question ?? '');
          onQueryChange(values.query ?? '');
        }}
      >
        <Form.Viewport>
          <Form.Content>
            <Form.FieldSet />
          </Form.Content>
        </Form.Viewport>
      </Form.Root>
    </Panel.Content>
  </Panel.Root>
);
