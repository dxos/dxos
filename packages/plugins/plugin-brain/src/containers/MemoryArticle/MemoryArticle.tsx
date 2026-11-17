//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useRef, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as ToolkitHooks from '@dxos/app-toolkit/Hooks';
import { log } from '@dxos/log';
import { type SparqlTerm } from '@dxos/pipeline-rdf';
import * as Button from '@dxos/react-ui/Button';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Input from '@dxos/react-ui/Input';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { BrainCapabilities } from '#types';

import { type FactStoreRegistry, type SparqlQueryRecord } from '../../capabilities/fact-store.ts';
import { BrainNamespace } from '../../namespace.ts';
import { downloadText, exportTrig, importTrig, runQuery, statementCount } from './memory.ts';
import { useQueryLog } from './use-query-log.ts';

const STARTER_QUERY = `SELECT ?p (COUNT(*) AS ?n) WHERE { GRAPH ?g { ?s ?p ?o } }
GROUP BY ?p ORDER BY DESC(?n) LIMIT 20`;

/**
 * The space's memory: its fact store imported from or exported to TriG (Turtle with named graphs), a SPARQL editor,
 * and the queries run against the store — an agent's included — each shown live with its results as it runs.
 */
export const MemoryArticle = () => {
  const registry = Hooks.useCapability(BrainCapabilities.FactStoreRegistry);
  const space = ToolkitHooks.useActiveSpace();
  return space ? <MemoryPanel registry={registry} spaceId={space.id} /> : null;
};

MemoryArticle.displayName = 'MemoryArticle';

const MemoryPanel = ({ registry, spaceId }: { registry: FactStoreRegistry; spaceId: string }) => {
  const { t } = UiHooks.useTranslation(BrainNamespace.key);
  const queryLog = useQueryLog(registry, spaceId);
  const [statements, setStatements] = useState<number | undefined>();
  const [status, setStatus] = useState<string | undefined>();
  const [draft, setDraft] = useState(STARTER_QUERY);
  // Follows the newest query until the viewer picks an older one; picking the newest again resumes following.
  const [pinned, setPinned] = useState<number | undefined>();
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const refresh = () => void statementCount(registry.forSpace(spaceId)).then(setStatements);
    refresh();
    return registry.subscribe(spaceId, refresh);
  }, [registry, spaceId]);

  const newest = queryLog.at(-1);
  const shown = (pinned !== undefined ? queryLog.find((entry) => entry.id === pinned) : undefined) ?? newest;

  const handleImport = useCallback(
    async (file: File) => {
      setStatus(t('memory-importing.message', { name: file.name }));
      const result = await importTrig(registry.forSpace(spaceId), await file.text());
      setStatus(
        'error' in result
          ? t('memory-import-failed.message', { error: result.error })
          : t('memory-imported.message', { total: result.quads.toLocaleString(), name: file.name }),
      );
    },
    [registry, spaceId, t],
  );

  const handleExport = useCallback(async () => {
    const result = await exportTrig(registry.forSpace(spaceId));
    if ('error' in result) {
      setStatus(t('memory-export-failed.message', { error: result.error }));
      return;
    }
    downloadText(result.trig, `memory-${spaceId}.trig`, 'application/trig');
  }, [registry, spaceId, t]);

  const handleRun = useCallback(() => {
    setPinned(undefined);
    void runQuery(registry.logged(spaceId), draft).catch((error) => log.catch(error));
  }, [registry, spaceId, draft]);

  return (
    <Panel.Root>
      {/* Outside the toolbar, which treats its children as controls. */}
      <input
        ref={fileInput}
        type='file'
        accept='.trig,.ttl,application/trig,text/turtle'
        className='hidden'
        data-testid='brain.memory.import-file'
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) {
            void handleImport(file);
          }
        }}
      />
      <Panel.Header>
        <Toolbar.Root>
          <Toolbar.Text data-testid='brain.memory.statements'>
            {statements === undefined ? '…' : t('memory-statements.label', { total: statements.toLocaleString() })}
          </Toolbar.Text>
          <Toolbar.Separator />
          <Button.Root
            variant='ghost'
            icon='ph--upload-simple--regular'
            label={t('memory-import.button')}
            onClick={() => fileInput.current?.click()}
            data-testid='brain.memory.import'
          />
          <Button.Root
            variant='ghost'
            icon='ph--download-simple--regular'
            label={t('memory-export.button')}
            onClick={() => void handleExport()}
            data-testid='brain.memory.export'
          />
          {status && <Toolbar.Text classNames='text-description truncate'>{status}</Toolbar.Text>}
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body classNames='grid grid-rows-[min-content_min-content_1fr] min-h-0'>
        <div className='flex flex-col gap-1 p-2 border-b border-separator'>
          <Input.Textarea
            rows={3}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                handleRun();
              }
            }}
            classNames='font-mono text-sm resize-y'
            data-testid='brain.memory.editor'
          />
          <div className='flex justify-end'>
            <Button.Root icon='ph--play--regular' label={t('memory-run.button')} onClick={handleRun} />
          </div>
        </div>
        <QueryHistory
          log={queryLog}
          selected={shown?.id}
          onSelect={(id) => setPinned(id === newest?.id ? undefined : id)}
        />
        <QueryView entry={shown} following={pinned === undefined} />
      </Panel.Body>
    </Panel.Root>
  );
};

/** The queries run so far, newest first, as a strip of chips; the shown one is highlighted. */
const QueryHistory = ({
  log: entries,
  selected,
  onSelect,
}: {
  log: readonly SparqlQueryRecord[];
  selected: number | undefined;
  onSelect: (id: number) => void;
}) => {
  const { t } = UiHooks.useTranslation(BrainNamespace.key);
  return (
    <div className='flex gap-1 p-2 overflow-x-auto border-b border-separator' data-testid='brain.memory.history'>
      {entries.length === 0 ? (
        <span className='text-description text-sm'>{t('memory-no-queries.message')}</span>
      ) : (
        [...entries]
          .reverse()
          .map((entry) => (
            <Button.Root
              key={entry.id}
              variant={entry.id === selected ? 'primary' : 'ghost'}
              label={`#${entry.id + 1}`}
              icon={entry.result === undefined ? 'ph--spinner--regular' : undefined}
              spin={entry.result === undefined}
              onClick={() => onSelect(entry.id)}
            />
          ))
      )}
    </div>
  );
};

/** One query: its text, whether it is still running, and its solutions as a table. */
const QueryView = ({ entry, following }: { entry: SparqlQueryRecord | undefined; following: boolean }) => {
  const { t } = UiHooks.useTranslation(BrainNamespace.key);
  if (!entry) {
    return null;
  }

  const result = entry.result;
  const columns = result && 'preview' in result ? [...new Set(result.preview.flatMap((row) => Object.keys(row)))] : [];
  return (
    <ScrollArea.Root>
      <ScrollArea.Viewport>
        <div className='flex flex-col gap-2 p-2' data-testid='brain.memory.query'>
          <div className='flex items-center gap-2 text-sm text-description'>
            <span>
              {following ? t('memory-live.label') : t('memory-query.label')} #{entry.id + 1}
            </span>
            <span data-testid='brain.memory.query-status'>
              {result === undefined
                ? t('memory-running.message')
                : 'error' in result
                  ? t('memory-query-failed.message')
                  : t('memory-rows.message', { total: result.count.toLocaleString() })}
            </span>
          </div>
          <pre className='font-mono text-sm whitespace-pre-wrap break-words p-2 rounded-sm bg-group-surface'>
            {entry.sparql.trim()}
          </pre>
          {result && 'error' in result && <p className='text-sm text-error-text'>{result.error}</p>}
          {result && 'preview' in result && result.preview.length > 0 && (
            <table className='text-sm border-collapse' data-testid='brain.memory.results'>
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th key={column} className='text-start font-medium px-2 py-1 border-b border-separator'>
                      ?{column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.preview.map((row, index) => (
                  <tr key={index}>
                    {columns.map((column) => (
                      <td key={column} className='px-2 py-1 align-top border-b border-separator'>
                        {formatTerm(row[column])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </ScrollArea.Viewport>
    </ScrollArea.Root>
  );
};

/** A term as a reader wants it: an IRI by its last segment, a literal by its value. */
const formatTerm = (term: SparqlTerm | undefined): string => {
  if (!term) {
    return '';
  }
  if (term.termType === 'Literal') {
    return term.value;
  }
  const local = term.value.split(/[/#]/).filter(Boolean).at(-1);
  return local ? decodeURIComponent(local) : term.value;
};
