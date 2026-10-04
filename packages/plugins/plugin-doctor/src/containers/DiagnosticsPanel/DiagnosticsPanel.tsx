//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo, useRef, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as PluginManagerProvider from '@dxos/app-framework/PluginManagerProvider';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as Banner from '@dxos/react-ui/Banner';
import * as Button from '@dxos/react-ui/Button';
import * as Flex from '@dxos/react-ui/Flex';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Panel from '@dxos/react-ui/Panel';
import * as Progress from '@dxos/react-ui/Progress';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Tag from '@dxos/react-ui/Tag';
import * as Theme from '@dxos/react-ui/Theme';
import * as Toolbar from '@dxos/react-ui/Toolbar';
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
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const spaces = Hooks.useCapability(ClientCapabilities.SpaceService);
  const graph = Hooks.useCapability(ClientCapabilities.Hypergraph);
  const manager = PluginManagerProvider.usePluginManager();
  const providers = Hooks.useCapabilities(DoctorCapabilities.DiagnosticProvider);
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
            providerLabel: Theme.toLocalizedString(provider.label, t),
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
    <Panel.Root>
      <Panel.Header>
        <Toolbar.Root>
          <Button.Button variant='primary' onClick={handleRun} disabled={isRunning || sortedProviders.length === 0}>
            <Icon.Icon icon='ph--play--regular' size='md' />
            <span className='ps-1'>{t('run-diagnostics.label')}</span>
          </Button.Button>
          {isRunning && (
            <Button.Button variant='ghost' onClick={handleCancel}>
              {t('cancel-diagnostics.label')}
            </Button.Button>
          )}
          <span className='grow' />
          <span className='text-xs text-fg-muted'>{t('providers-count.label', { count: sortedProviders.length })}</span>
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body asChild>
        <ScrollArea.Root>
          <ScrollArea.Viewport>
            {runState.status === 'idle' && <p className='p-2 text-sm text-fg-muted'>{t('idle.description')}</p>}
            {runState.status === 'running' && <RunProgress state={runState} t={t} />}
            {runState.status === 'done' && <RunSummary results={runState.results} t={t} />}
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Body>
    </Panel.Root>
  );
};

const RunProgress = ({
  state,
  t,
}: {
  state: { readonly current: number; readonly total: number; readonly providerLabel?: string };
  t: Theme.TFunction;
}) => {
  const progress = state.total === 0 ? 0 : state.current / state.total;
  return (
    <Flex.Flex column gap='sm' classNames='p-2'>
      <Progress.Progress value={progress} classNames='block' />
      <span className='text-xs text-fg-muted'>
        {t('progress.label', {
          current: state.current,
          total: state.total,
          label: state.providerLabel ?? '',
        })}
      </span>
    </Flex.Flex>
  );
};

const RunSummary = ({ results, t }: { results: readonly DiagnosticRunResult[]; t: Theme.TFunction }) => {
  const totalIssues = results.reduce((sum, result) => sum + result.issues.length, 0);
  const failedProviders = results.filter((result) => result.error != null).length;
  return (
    <Flex.Flex column gap='sm' classNames='p-2'>
      <p className='text-sm font-medium'>{t('summary.label', { count: totalIssues })}</p>
      {failedProviders > 0 && (
        <p className='text-xs text-rose-600'>{t('summary.failed.label', { count: failedProviders })}</p>
      )}
      {results.map((result) => (
        <ProviderResult key={result.providerId} result={result} t={t} />
      ))}
    </Flex.Flex>
  );
};

const ProviderResult = ({ result, t }: { result: DiagnosticRunResult; t: Theme.TFunction }) => {
  const status = result.error ? 'error' : result.issues.length === 0 ? 'pass' : 'issues';
  const label = Theme.toLocalizedString(result.label, t);
  return (
    <section className='rounded border border-separator dx-base-surface'>
      <header className='flex items-center justify-between gap-2 p-2'>
        <span className='text-sm font-medium truncate'>{label}</span>
        {status === 'pass' && (
          <Tag.Tag hue='emerald'>
            <Icon.Icon icon='ph--check--regular' size='xs' />
          </Tag.Tag>
        )}
        {status === 'issues' && (
          <Tag.Tag hue='amber'>{t('result.issues.label', { count: result.issues.length })}</Tag.Tag>
        )}
        {status === 'error' && <Tag.Tag hue='rose'>{t('result.error.label')}</Tag.Tag>}
      </header>
      {result.error && (
        <Banner.Root valence='error'>
          <Banner.Body>{result.error}</Banner.Body>
        </Banner.Root>
      )}
      {result.issues.length > 0 && (
        <ul className='border-t border-separator divide-y divide-separator-subtle'>
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
    <Icon.Icon icon={SEVERITY_ICON[issue.severity]} size='md' classNames={mx(paletteToText(issue.severity))} />
    <Flex.Flex column gap='xs' classNames='text-xs min-w-0 flex-1'>
      <span className='wrap-break-words break-all'>{issue.message}</span>
      {(issue.subjectLabel || issue.spaceId) && (
        <span className='text-fg-muted font-mono break-all'>
          {issue.subjectLabel ?? ''}
          {issue.subjectLabel && issue.spaceId ? ' · ' : ''}
          {issue.spaceId ?? ''}
        </span>
      )}
    </Flex.Flex>
  </li>
);

const paletteToText = (severity: DiagnosticSeverity): string => {
  switch (SEVERITY_PALETTE[severity]) {
    case 'rose':
      return 'text-rose-600';
    case 'amber':
      return 'text-amber-600';
    default:
      return 'text-fg-muted';
  }
};

DiagnosticsPanel.displayName = 'DiagnosticsPanel';
