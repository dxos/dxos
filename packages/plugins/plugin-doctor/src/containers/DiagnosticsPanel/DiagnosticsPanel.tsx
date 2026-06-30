//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo, useRef, useState } from 'react';

import { useCapabilities, usePluginManager } from '@dxos/app-framework/ui';
import { useClient } from '@dxos/react-client';
import {
  Button,
  Icon,
  Message,
  Panel,
  ScrollArea,
  Status,
  Tag,
  type TFunction,
  Toolbar,
  toLocalizedString,
  useTranslation,
} from '@dxos/react-ui';

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

const SEVERITY_ICON: Record<DiagnosticSeverity, string> = {
  info: 'ph--info--regular',
  warning: 'ph--warning--regular',
  error: 'ph--x-circle--regular',
};

const SEVERITY_PALETTE: Record<DiagnosticSeverity, 'neutral' | 'amber' | 'rose'> = {
  info: 'neutral',
  warning: 'amber',
  error: 'rose',
};

export const DiagnosticsPanel = () => {
  const { t } = useTranslation(meta.profile.key);
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
    try {
      const results = await runDiagnostics({
        client,
        capabilities: manager.capabilities,
        providers: sortedProviders,
        signal: controller.signal,
        onProviderStart: (provider, index, total) => {
          if (controller.signal.aborted) {
            return;
          }
          setRunState({
            status: 'running',
            current: index,
            total,
            providerLabel: toLocalizedString(provider.label, t),
          });
        },
        onProviderComplete: (_, index, total) => {
          if (controller.signal.aborted) {
            return;
          }
          setRunState({ status: 'running', current: index + 1, total });
        },
      });
      if (!controller.signal.aborted) {
        setRunState({ status: 'done', results });
      }
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = undefined;
      }
    }
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
            <span className='pis-1'>{t('run-diagnostics.label')}</span>
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
            {runState.status === 'idle' && <p className='p-2 text-sm text-description'>{t('idle.description')}</p>}
            {runState.status === 'running' && <RunProgress state={runState} t={t} />}
            {runState.status === 'done' && <RunSummary results={runState.results} t={t} />}
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Content>
    </Panel.Root>
  );
};

const RunProgress = ({
  state,
  t,
}: {
  state: { readonly current: number; readonly total: number; readonly providerLabel?: string };
  t: TFunction;
}) => {
  const progress = state.total === 0 ? 0 : state.current / state.total;
  return (
    <div className='flex flex-col gap-2 p-2'>
      <Status progress={progress} classNames='block' />
      <span className='text-xs text-description'>
        {t('progress.label', {
          current: state.current,
          total: state.total,
          label: state.providerLabel ?? '',
        })}
      </span>
    </div>
  );
};

const RunSummary = ({ results, t }: { results: readonly DiagnosticRunResult[]; t: TFunction }) => {
  const totalIssues = results.reduce((sum, result) => sum + result.issues.length, 0);
  const failedProviders = results.filter((result) => result.error != null).length;
  return (
    <div className='flex flex-col gap-2 p-2'>
      <p className='text-sm font-medium'>{t('summary.label', { count: totalIssues })}</p>
      {failedProviders > 0 && (
        <p className='text-xs text-rose-600'>{t('summary.failed.label', { count: failedProviders })}</p>
      )}
      {results.map((result) => (
        <ProviderResult key={result.providerId} result={result} t={t} />
      ))}
    </div>
  );
};

const ProviderResult = ({ result, t }: { result: DiagnosticRunResult; t: TFunction }) => {
  const status = result.error ? 'error' : result.issues.length === 0 ? 'pass' : 'issues';
  const label = toLocalizedString(result.label, t);
  return (
    <section className='rounded border border-separator bg-baseSurface'>
      <header className='flex items-center justify-between gap-2 p-2'>
        <span className='text-sm font-medium truncate'>{label}</span>
        {status === 'pass' && (
          <Tag hue='emerald'>
            <Icon icon='ph--check--regular' size={3} />
          </Tag>
        )}
        {status === 'issues' && <Tag hue='amber'>{t('result.issues.label', { count: result.issues.length })}</Tag>}
        {status === 'error' && <Tag hue='rose'>{t('result.error.label')}</Tag>}
      </header>
      {result.error && (
        <Message.Root valence='error' classNames='m-2'>
          <Message.Content>{result.error}</Message.Content>
        </Message.Root>
      )}
      {result.issues.length > 0 && (
        <ul className='border-t border-separator divide-y divide-separator'>
          {result.issues.map((issue) => (
            <IssueRow key={issue.id} issue={issue} />
          ))}
        </ul>
      )}
    </section>
  );
};

const IssueRow = ({ issue }: { issue: DiagnosticIssue }) => (
  <li className='flex items-start gap-2 p-2'>
    <Icon
      icon={SEVERITY_ICON[issue.severity]}
      size={4}
      classNames={`${paletteToText(issue.severity)} shrink-0 mt-0.5`}
    />
    <div className='flex flex-col gap-0.5 text-xs min-w-0 flex-1'>
      <span className='break-words break-all'>{issue.message}</span>
      {(issue.subjectLabel || issue.spaceId) && (
        <span className='text-description font-mono break-all'>
          {issue.subjectLabel ?? ''}
          {issue.subjectLabel && issue.spaceId ? ' · ' : ''}
          {issue.spaceId ?? ''}
        </span>
      )}
    </div>
  </li>
);

const paletteToText = (severity: DiagnosticSeverity): string => {
  switch (SEVERITY_PALETTE[severity]) {
    case 'rose':
      return 'text-rose-600';
    case 'amber':
      return 'text-amber-600';
    default:
      return 'text-description';
  }
};
