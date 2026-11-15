//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useMemo } from 'react';

import { Editor } from '@dxos/react-ui-editor';
import { Form } from '@dxos/react-ui-form';
import { TurtleSnippet } from '@dxos/react-ui-rdf';
import * as Banner from '@dxos/react-ui/Banner';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Layout from '@dxos/react-ui/Layout';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import type * as Util from '@dxos/react-ui/Util';
import { createBasicExtensions, createThemeExtensions, sparql } from '@dxos/ui-editor';

// Default SPARQL: every statement, by its graph; binding `?g` makes the result a set of facts.
export const DEFAULT_SPARQL = [
  'PREFIX sx: <https://dxos.org/semantic#>',
  'SELECT DISTINCT ?g ?s ?p ?o WHERE {',
  '  GRAPH ?g { ?s ?p ?o }',
  '  ?g a sx:Graph .',
  '} LIMIT 500',
].join('\n');

const QuestionOptions = Schema.Struct({
  question: Schema.String.annotate({ title: 'Question' }),
});

/** The raw answer to the last run: the graphs a `?g` query binds as TriG, else its solutions as SPARQL `VALUES`. */
export type QueryPanelResult = {
  kind: 'graphs' | 'rows';
  /** How many graphs, or solutions. */
  count: number;
  /** TriG for `graphs`, a SPARQL `VALUES` block for `rows`. */
  text: string;
};

/** The step a query is in; each action shows its own progress so a slow LLM call reads apart from a store read. */
export type QueryPanelPending = 'generate' | 'run' | 'reset';

export type QueryPanelProps = Util.ThemedClassName<{
  /** Natural-language question; Generate translates it into the SPARQL field. */
  question: string;
  query: string;
  pending?: QueryPanelPending;
  /** The last action's failure, shown above the editor until the next action. */
  error?: { action: QueryPanelPending; message: string };
  result?: QueryPanelResult;
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
 * Query column: a plain-language question, an editable, highlighted SPARQL query and its raw result. Generate
 * translates the question into SPARQL (LLM) and writes it into the editor; Run executes the SPARQL as written. Pure/presentational — the parent owns both strings and the handlers.
 */
export const QueryPanel = ({
  question,
  query,
  pending,
  error,
  result,
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
          {result && (
            <Layout.Flex column grow classNames='border-t border-separator' data-testid='query-panel.result'>
              <Toolbar.Root>
                <Toolbar.Text>
                  {result.count} {result.kind === 'graphs' ? 'graph' : 'row'}
                  {result.count === 1 ? '' : 's'}
                </Toolbar.Text>
              </Toolbar.Root>
              <ScrollArea.Root orientation='all'>
                <ScrollArea.Viewport>
                  <TurtleSnippet
                    className='p-2 text-xs select-text cursor-text'
                    language={result.kind === 'graphs' ? 'turtle' : 'sparql'}
                    source={result.text}
                  />
                </ScrollArea.Viewport>
              </ScrollArea.Root>
            </Layout.Flex>
          )}
        </Layout.Flex>
      </Panel.Body>
    </Panel.Root>
  );
};
