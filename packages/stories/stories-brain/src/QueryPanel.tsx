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
  query: Schema.String.pipe(
    Format.FormatAnnotation.set(Format.TypeFormat.Markdown),
    Schema.annotations({ title: 'SPARQL' }),
  ),
});

export type QueryPanelProps = ThemedClassName<{
  query: string;
  busy?: boolean;
  onQueryChange: (query: string) => void;
  onRun: () => void;
}>;

/**
 * SPARQL query column: a Markdown-annotated query field with a Run action in its toolbar. The query
 * is parsed to a structured query and executed over the store by the parent (no Comunica in the
 * browser). Pure/presentational — the parent owns the query string and the run handler.
 */
export const QueryPanel = ({ query, busy, onQueryChange, onRun, classNames }: QueryPanelProps) => (
  <Panel.Root classNames={classNames}>
    <Panel.Toolbar asChild>
      <Toolbar.Root>
        <Toolbar.Text classNames='grow'>Query</Toolbar.Text>
        <IconButton icon='ph--play--regular' iconOnly label='Run' disabled={!!busy || !query} onClick={onRun} />
      </Toolbar.Root>
    </Panel.Toolbar>
    <Panel.Content classNames='dx-container'>
      <Form.Root
        schema={QueryOptions}
        values={{ query }}
        onValuesChanged={(values) => onQueryChange(values.query ?? '')}
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
