//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useMemo } from 'react';

import { Editor } from '@dxos/react-ui-editor';
import { Form } from '@dxos/react-ui-form';
import * as Banner from '@dxos/react-ui/Banner';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Layout from '@dxos/react-ui/Layout';
import * as Panel from '@dxos/react-ui/Panel';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import type * as Util from '@dxos/react-ui/Util';
import { createBasicExtensions, createThemeExtensions, sparql } from '@dxos/ui-editor';

// Default SPARQL: every fact. Parsed to a structured query and run over the store (no Comunica).
export const DEFAULT_SPARQL = 'SELECT ?fact ?p ?o WHERE { ?fact ?p ?o }';

const QuestionOptions = Schema.Struct({
  question: Schema.String.annotate({ title: 'Question' }),
});

/** The step a query is in; each action shows its own progress so a slow LLM call reads apart from a store read. */
export type QueryPanelPending = 'generate' | 'run' | 'reset';

export type QueryPanelProps = Util.ThemedClassName<{
  /** Natural-language question; Generate translates it into the SPARQL field. */
  question: string;
  query: string;
  pending?: QueryPanelPending;
  /** The last action's failure, shown above the editor until the next action. */
  error?: { action: QueryPanelPending; message: string };
  onQuestionChange: (question: string) => void;
  onQueryChange: (query: string) => void;
  onGenerate: () => void;
  onRun: () => void;
  /** Restore the default query and clear the filter on the facts view (show all facts). */
  onReset: () => void;
  onDismissError?: () => void;
}>;

const ERROR_TITLES: Record<QueryPanelPending, string> = {
  generate: 'Could not generate SPARQL',
  run: 'Could not run the query',
  reset: 'Could not reload the facts',
};

/**
 * Query column: a plain-language question and an editable, highlighted SPARQL query. Generate translates the question
 * into SPARQL (LLM) and writes it into the editor; Run parses that SPARQL into a structured query and executes it over
 * the store (no Comunica in the browser). Pure/presentational — the parent owns both strings and the handlers.
 */
export const QueryPanel = ({
  question,
  query,
  pending,
  error,
  onQuestionChange,
  onQueryChange,
  onGenerate,
  onRun,
  onReset,
  onDismissError,
  classNames,
}: QueryPanelProps) => {
  const themeMode = Hooks.useThemeMode();
  const extensions = useMemo(
    () => [
      createBasicExtensions({ lineWrapping: true, placeholder: 'SPARQL — generate it from the question or write it' }),
      createThemeExtensions({ themeMode, monospace: true, syntaxHighlighting: true }),
      sparql(),
    ],
    [themeMode],
  );
  const busy = pending !== undefined;
  const generating = pending === 'generate';

  return (
    <Panel.Root classNames={classNames}>
      <Panel.Header>
        <Toolbar.Root>
          <Button.Root
            icon={generating ? 'ph--spinner-gap--regular' : 'ph--sparkle--regular'}
            spin={generating}
            label={generating ? 'Generating…' : 'Generate SPARQL'}
            disabled={busy || !question}
            aria-busy={generating}
            data-testid='query-panel.generate'
            onClick={onGenerate}
          />
          <Toolbar.Separator />
          <Button.Root
            icon={pending === 'run' ? 'ph--spinner-gap--regular' : 'ph--play--regular'}
            spin={pending === 'run'}
            iconOnly
            label={pending === 'run' ? 'Running…' : 'Run'}
            disabled={busy || !query}
            aria-busy={pending === 'run'}
            onClick={onRun}
          />
          <Button.Root
            icon='ph--arrow-counter-clockwise--regular'
            iconOnly
            label='Reset query'
            disabled={busy}
            onClick={onReset}
          />
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body asChild>
        <Layout.Flex column>
          <Form.Root
            schema={QuestionOptions}
            values={{ question }}
            onValuesChanged={(values) => onQuestionChange(values.question ?? '')}
          >
            <Form.Content>
              <Form.Fields />
            </Form.Content>
          </Form.Root>
          {error && (
            <Banner.Root valence='error' data-testid='query-panel.error'>
              <Banner.Title onClose={onDismissError}>{ERROR_TITLES[error.action]}</Banner.Title>
              <Banner.Body>{error.message}</Banner.Body>
            </Banner.Root>
          )}
          <Layout.Flex column grow>
            <Editor.Root>
              <Editor.View classNames='dx-fill' value={query} onChange={onQueryChange} extensions={extensions} />
            </Editor.Root>
          </Layout.Flex>
        </Layout.Flex>
      </Panel.Body>
    </Panel.Root>
  );
};
