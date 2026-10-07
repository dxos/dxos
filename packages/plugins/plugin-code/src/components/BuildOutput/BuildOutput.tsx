//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Hooks from '@dxos/react-ui/Hooks';
import * as Layout from '@dxos/react-ui/Layout';
import { mx } from '@dxos/ui-theme';

import { meta } from '#meta';
import { CodeCapabilities } from '#types';

export type BuildOutputProps = {
  state: CodeCapabilities.ProjectBuildState | undefined;
};

/**
 * Diagnostics + console pane for F-12a. Lives in the bottom-left of
 * `CodeArticle` (replacing the previous empty "inspect" placeholder).
 *
 * Renders three stacked sections: a status header, the most recent build's
 * diagnostics (errors and warnings, with path + line/column), and the most
 * recent run's stdout / stderr lines.
 */
export const BuildOutput = ({ state }: BuildOutputProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const build = state?.lastBuild;
  const run = state?.lastRun;

  if (!build && !run) {
    return (
      <Layout.Grid grow classNames='p-2 overflow-auto text-xs text-fg-muted'>
        {t('diagnostics.empty.placeholder')}
      </Layout.Grid>
    );
  }

  return (
    <Layout.Grid grow rows={['auto', 'fill']} classNames='text-xs'>
      <BuildStatus build={build} run={run} />
      <Layout.Grid grow cols={2} classNames='divide-x divide-separator'>
        <DiagnosticsList diagnostics={build?.diagnostics ?? []} />
        <ConsoleView stdout={run?.stdout ?? []} stderr={run?.stderr ?? []} />
      </Layout.Grid>
    </Layout.Grid>
  );
};

type BuildStatusProps = {
  build: CodeCapabilities.BuildState | undefined;
  run: CodeCapabilities.RunState | undefined;
};

const BuildStatus = ({ build, run }: BuildStatusProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  if (!build) {
    return null;
  }

  const buildLabel = build.ok ? t('build.clean.label') : t('build.failed.label');
  const runLabel = run ? (run.ok ? null : t('run.failed.label')) : null;
  return (
    <Layout.Flex gap='sm' align='center' classNames='px-2 py-1 border-b border-separator'>
      <span className={mx(build.ok ? 'text-success-text' : 'text-error-text')}>● {buildLabel}</span>
      {runLabel && <span className='text-error-text'>● {runLabel}</span>}
    </Layout.Flex>
  );
};

type DiagnosticsListProps = {
  diagnostics: ReadonlyArray<CodeCapabilities.Diagnostic>;
};

const DiagnosticsList = ({ diagnostics }: DiagnosticsListProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  return (
    <Layout.Flex column classNames='dx-expand overflow-auto'>
      <SectionHeader label={t('diagnostics.section.label')} count={diagnostics.length} />
      {diagnostics.length === 0 ? (
        <div className='p-2 text-fg-muted'>—</div>
      ) : (
        <ol className='flex flex-col'>
          {diagnostics.map((diagnostic, index) => (
            <li
              key={index}
              className={mx(
                'px-2 py-1 border-b border-separator font-mono',
                diagnostic.severity === 'error' ? 'text-error-text' : 'text-warning-text',
              )}
            >
              {diagnostic.path && (
                <span className='text-fg-muted'>
                  {diagnostic.path}
                  {diagnostic.line !== undefined && `:${diagnostic.line}`}
                  {diagnostic.column !== undefined && `:${diagnostic.column}`}
                  {' — '}
                </span>
              )}
              <span>{diagnostic.message}</span>
            </li>
          ))}
        </ol>
      )}
    </Layout.Flex>
  );
};

type ConsoleViewProps = {
  stdout: ReadonlyArray<string>;
  stderr: ReadonlyArray<string>;
};

const ConsoleView = ({ stdout, stderr }: ConsoleViewProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const total = stdout.length + stderr.length;
  return (
    <Layout.Flex column classNames='dx-expand overflow-auto'>
      <SectionHeader label={t('console.section.label')} count={total} />
      {total === 0 ? (
        <div className='p-2 text-fg-muted'>{t('console.empty.placeholder')}</div>
      ) : (
        <pre className='flex flex-col px-2 py-1 font-mono whitespace-pre-wrap break-all'>
          {stdout.map((line, index) => (
            <span key={`out-${index}`}>{line}</span>
          ))}
          {stderr.map((line, index) => (
            <span key={`err-${index}`} className='text-error-text'>
              {line}
            </span>
          ))}
        </pre>
      )}
    </Layout.Flex>
  );
};

const SectionHeader = ({ label, count }: { label: string; count: number }) => (
  <Layout.Flex
    align='center'
    gap='sm'
    classNames='px-2 py-1 text-fg-muted border-b border-separator dx-toolbar-surface'
  >
    <span>{label}</span>
    <span className='text-fg-muted'>({count})</span>
  </Layout.Flex>
);
