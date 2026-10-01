//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo, useRef, useState } from 'react';

import { useCapabilities, useCapability, usePluginManager } from '@dxos/app-framework/ui';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import { Flex, type TFunction, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { Next } from '@dxos/react-ui/next';
import { mx } from '@dxos/ui-theme';

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
  const spaces = useCapability(ClientCapabilities.SpaceService);
  const graph = useCapability(ClientCapabilities.Hypergraph);
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
        spaces,
        graph,
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
  }, [spaces, graph, manager, sortedProviders, t]);

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = undefined;
    setRunState({ status: 'idle' });
  }, []);

  return (
    <Next.Panel.Root>
      <Next.Panel.Header>
        <Next.Toolbar.Root>
          <Next.Button variant='primary' onClick={handleRun} disabled={isRunning || sortedProviders.length === 0}>
            <Next.Icon icon='ph--play--regular' size='md' />
            <span className='ps-1'>{t('run-diagnostics.label')}</span>
          </Next.Button>
          {isRunning && (
            <Next.Button variant='ghost' onClick={handleCancel}>
              {t('cancel-diagnostics.label')}
            </Next.Button>
          )}
          <span className='grow' />
          <span className='text-xs text-description'>
            {t('providers-count.label', { count: sortedProviders.length })}
          </span>
        </Next.Toolbar.Root>
      </Next.Panel.Header>
      <Next.Panel.Body asChild>
        <Next.ScrollArea.Root>
          <Next.ScrollArea.Viewport>
            {runState.status === 'idle' && <p className='p-2 text-sm text-description'>{t('idle.description')}</p>}
            {runState.status === 'running' && <RunProgress state={runState} t={t} />}
            {runState.status === 'done' && <RunSummary results={runState.results} t={t} />}
          </Next.ScrollArea.Viewport>
        </Next.ScrollArea.Root>
      </Next.Panel.Body>
    </Next.Panel.Root>
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
    <Flex column gap='sm' classNames='p-2'>
      <Next.Progress value={progress} classNames='block' />
      <span className='text-xs text-description'>
        {t('progress.label', {
          current: state.current,
          total: state.total,
          label: state.providerLabel ?? '',
        })}
      </span>
    </Flex>
  );
};

const RunSummary = ({ results, t }: { results: readonly DiagnosticRunResult[]; t: TFunction }) => {
  const totalIssues = results.reduce((sum, result) => sum + result.issues.length, 0);
  const failedProviders = results.filter((result) => result.error != null).length;
  return (
    <Flex column gap='sm' classNames='p-2'>
      <p className='text-sm font-medium'>{t('summary.label', { count: totalIssues })}</p>
      {failedProviders > 0 && (
        <p className='text-xs text-rose-600'>{t('summary.failed.label', { count: failedProviders })}</p>
      )}
      {results.map((result) => (
        <ProviderResult key={result.providerId} result={result} t={t} />
      ))}
    </Flex>
  );
};

const ProviderResult = ({ result, t }: { result: DiagnosticRunResult; t: TFunction }) => {
  const status = result.error ? 'error' : result.issues.length === 0 ? 'pass' : 'issues';
  const label = toLocalizedString(result.label, t);
  return (
    <section className='rounded border border-separator dx-base-surface'>
      <header className='flex items-center justify-between gap-2 p-2'>
        <span className='text-sm font-medium truncate'>{label}</span>
        {status === 'pass' && (
          <Next.Tag hue='emerald'>
            <Next.Icon icon='ph--check--regular' size='xs' />
          </Next.Tag>
        )}
        {status === 'issues' && (
          <Next.Tag hue='amber'>{t('result.issues.label', { count: result.issues.length })}</Next.Tag>
        )}
        {status === 'error' && <Next.Tag hue='rose'>{t('result.error.label')}</Next.Tag>}
      </header>
      {result.error && (
        <Next.Banner.Root valence='error'>
          <Next.Banner.Body>{result.error}</Next.Banner.Body>
        </Next.Banner.Root>
      )}
      {result.issues.length > 0 && (
        <ul className='border-t border-separator divide-y divide-subdued-separator'>
          {result.issues.map((issue) => (
            <IssueRow key={issue.id} issue={issue} />
          ))}
        </ul>
      )}
    </section>
  );
};

const IssueRow = ({ issue }: { issue: DiagnosticIssue }) => (
  <li className='flex items-center gap-2 p-2'>
    <Next.Icon icon={SEVERITY_ICON[issue.severity]} size='md' classNames={mx(paletteToText(issue.severity))} />
    <Flex column gap='xs' classNames='text-xs min-w-0 flex-1'>
      <span className='wrap-break-words break-all'>{issue.message}</span>
      {(issue.subjectLabel || issue.spaceId) && (
        <span className='text-description font-mono break-all'>
          {issue.subjectLabel ?? ''}
          {issue.subjectLabel && issue.spaceId ? ' · ' : ''}
          {issue.spaceId ?? ''}
        </span>
      )}
    </Flex>
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

DiagnosticsPanel.displayName = 'DiagnosticsPanel';
