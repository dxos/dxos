//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React from 'react';

import { Format } from '@dxos/echo';
import { Form } from '@dxos/react-ui-form';
import * as Button from '@dxos/react-ui/Button';
import * as Panel from '@dxos/react-ui/Panel';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import type * as Util from '@dxos/react-ui/Util';

// Default SPARQL: every fact. Parsed to a structured query and run over the store (no Comunica).
export const DEFAULT_SPARQL = 'SELECT ?fact ?p ?o WHERE { ?fact ?p ?o }';

const QueryOptions = Schema.Struct({
  question: Schema.String.annotate({ title: 'Query' }),
  query: Schema.String.pipe(
    Format.FormatAnnotation.set(Format.TypeFormat.Markdown),
    Schema.annotate({ title: 'SPARQL' }),
  ),
});

export type QueryPanelProps = Util.ThemedClassName<{
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
    <Panel.Header>
      <Toolbar.Root>
        <Toolbar.Separator />
        <Button.Root
          icon='ph--sparkle--regular'
          iconOnly
          label='Generate SPARQL'
          disabled={!!busy || !question}
          onClick={onGenerate}
        />
        <Button.Root icon='ph--play--regular' iconOnly label='Run' disabled={!!busy || !query} onClick={onRun} />
        <Button.Root
          icon='ph--arrow-counter-clockwise--regular'
          iconOnly
          label='Reset query'
          disabled={!!busy}
          onClick={onReset}
        />
      </Toolbar.Root>
    </Panel.Header>
    <Panel.Body>
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
            <Form.Fields />
          </Form.Content>
        </Form.Viewport>
      </Form.Root>
    </Panel.Body>
  </Panel.Root>
);
