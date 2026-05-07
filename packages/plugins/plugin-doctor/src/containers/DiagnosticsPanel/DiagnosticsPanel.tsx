//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo, useRef, useState } from 'react';

import { useCapabilities, usePluginManager } from '@dxos/app-framework/ui';
import { useClient } from '@dxos/react-client';
import { Button, Icon, Panel, ScrollArea, Tag, Toolbar, useTranslation } from '@dxos/react-ui';

import {
  type DiagnosticIssue,
  type DiagnosticProvider,
  type DiagnosticRunResult,
  type DiagnosticSeverity,
  runDiagnostics,
} from '#diagnostics';
import { meta } from '#meta';
import { DoctorCapabilities } from '#types';

type RunState =
  | { readonly status: 'idle' }
  | { readonly status: 'running'; readonly current: number; readonly total: number; readonly providerLabel?: string }
  | { readonly status: 'done'; readonly results: readonly DiagnosticRunResult[] };

const SEVERITY_PALETTE: Record<DiagnosticSeverity, 'neutral' | 'amber' | 'rose'> = {
  info: 'neutral',
  warning: 'amber',
  error: 'rose',
};

export const DiagnosticsPanel = () => {
  const { t } = useTranslation(meta.id);
  const client = useClient();
  const manager = usePluginManager();
  const providers = useCapabilities(DoctorCapabilities.DiagnosticProvider);
  const [runState, setRunState] = useState<RunState>({ status: 'idle' });
  const abortRef = useRef<AbortController | undefined>(undefined);

  const sortedProviders = useMemo<readonly DiagnosticProvider[]>(
    () => [...providers].sort((left, right) => left.id.localeCompare(right.id)),
    [providers],
  );
  const isRunning = runState.status === 'running';

  const handleRun = useCallback(async () => {
    if (sortedProviders.length === 0) {
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setRunState({ status: 'running', current: 0, total: sortedProviders.length });
    const results = await runDiagnostics({
      client,
      capabilities: manager.capabilities,
      providers: sortedProviders,
      signal: controller.signal,
      onProviderStart: (provider, index, total) => {
        setRunState({ status: 'running', current: index, total, providerLabel: t(provider.label) });
      },
      onProviderComplete: (_, index, total) => {
        setRunState({ status: 'running', current: index + 1, total });
      },
    });
    abortRef.current = undefined;
    setRunState({ status: 'done', results });
  }, [client, manager, sortedProviders, t]);

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = undefined;
    setRunState({ status: 'idle' });
  }, []);

  return (
    <Panel.Root>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Button variant='primary' onClick={handleRun} disabled={isRunning || sortedProviders.length === 0}>
            <Icon icon='ph--play--regular' size={4} />
            <span>{t('run-diagnostics.label')}</span>
          </Button>
          {isRunning && (
            <Button variant='ghost' onClick={handleCancel}>
              {t('cancel-diagnostics.label')}
            </Button>
          )}
          <span className='grow' />
          <span className='text-xs text-description'>
            {t('providers-count.label', { count: sortedProviders.length })}
          </span>
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content asChild>
        <ScrollArea.Root>
          <ScrollArea.Viewport>
            <div className='flex flex-col gap-3 p-3'>
              {runState.status === 'idle' && <p className='text-sm text-description'>{t('idle.description')}</p>}
              {runState.status === 'running' && <RunProgress state={runState} t={t} />}
              {runState.status === 'done' && <RunSummary results={runState.results} t={t} />}
            </div>
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Content>
    </Panel.Root>
  );
};

type Translator = (key: string, options?: Record<string, unknown>) => string;

const RunProgress = ({
  state,
  t,
}: {
  state: { readonly current: number; readonly total: number; readonly providerLabel?: string };
  t: Translator;
}) => {
  const percent = state.total === 0 ? 0 : Math.min(100, Math.round((state.current / state.total) * 100));
  return (
    <div className='flex flex-col gap-2'>
      <div className='flex items-center justify-between text-sm'>
        <span>
          {t('progress.label', {
            current: state.current,
            total: state.total,
            label: state.providerLabel ?? '',
          })}
        </span>
        <span className='text-description'>{percent}%</span>
      </div>
      <div className='h-1 rounded bg-neutralContainer'>
        <div className='h-1 rounded bg-primary-500' style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
};

const RunSummary = ({ results, t }: { results: readonly DiagnosticRunResult[]; t: Translator }) => {
  const totalIssues = results.reduce((sum, result) => sum + result.issues.length, 0);
  return (
    <div className='flex flex-col gap-3'>
      <div className='flex items-center gap-2 text-sm'>
        <span className='font-medium'>{t('summary.label', { total: totalIssues })}</span>
      </div>
      {results.map((result) => (
        <ProviderResult key={result.providerId} result={result} t={t} />
      ))}
    </div>
  );
};

const ProviderResult = ({ result, t }: { result: DiagnosticRunResult; t: Translator }) => {
  const status = result.error ? 'error' : result.issues.length === 0 ? 'pass' : 'issues';
  return (
    <section className='rounded border border-separator p-2'>
      <header className='flex items-center justify-between gap-2'>
        <span className='text-sm font-medium'>{t(result.label)}</span>
        <div className='flex items-center gap-2'>
          {status === 'pass' && (
            <Tag palette='emerald'>
              <Icon icon='ph--check--regular' size={3} />
              <span>{t('result.ok.label')}</span>
            </Tag>
          )}
          {status === 'issues' && (
            <Tag palette='amber'>{t('result.issues.label', { count: result.issues.length })}</Tag>
          )}
          {status === 'error' && <Tag palette='rose'>{t('result.error.label')}</Tag>}
          <span className='text-xs text-description'>{result.durationMs}ms</span>
        </div>
      </header>
      {result.error && <p className='mt-2 text-xs text-rose-600'>{result.error}</p>}
      {result.issues.length > 0 && (
        <ul className='mt-2 flex flex-col gap-1'>
          {result.issues.map((issue) => (
            <IssueRow key={issue.id} issue={issue} />
          ))}
        </ul>
      )}
    </section>
  );
};

const IssueRow = ({ issue }: { issue: DiagnosticIssue }) => (
  <li className='flex items-start gap-2 text-xs'>
    <Tag palette={SEVERITY_PALETTE[issue.severity]}>{issue.severity}</Tag>
    <div className='flex flex-col'>
      <span>{issue.message}</span>
      {(issue.subjectLabel || issue.spaceId) && (
        <span className='text-description'>
          {issue.subjectLabel ?? ''}
          {issue.subjectLabel && issue.spaceId ? ' · ' : ''}
          {issue.spaceId ?? ''}
        </span>
      )}
    </div>
  </li>
);
