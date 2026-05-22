//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { meta } from '#meta';
import { type CodeCapabilities } from '#types';

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
  const { t } = useTranslation(meta.id);
  const build = state?.lastBuild;
  const run = state?.lastRun;

  if (!build && !run) {
    return (
      <div className='dx-container grid p-2 overflow-auto text-xs text-description'>
        {t('diagnostics.empty.placeholder')}
      </div>
    );
  }

  return (
    <div className='dx-container grid grid-rows-[auto_1fr] overflow-hidden text-xs'>
      <BuildStatus build={build} run={run} />
      <div className='dx-container grid grid-cols-2 divide-x divide-separator overflow-hidden'>
        <DiagnosticsList diagnostics={build?.diagnostics ?? []} />
        <ConsoleView stdout={run?.stdout ?? []} stderr={run?.stderr ?? []} />
      </div>
    </div>
  );
};

type BuildStatusProps = {
  build: CodeCapabilities.BuildState | undefined;
  run: CodeCapabilities.RunState | undefined;
};

const BuildStatus = ({ build, run }: BuildStatusProps) => {
  const { t } = useTranslation(meta.id);
  if (!build) {
    return null;
  }
  const buildLabel = build.ok ? t('build.clean.label') : t('build.failed.label');
  const runLabel = run ? (run.ok ? null : t('run.failed.label')) : null;
  return (
    <div className='flex gap-2 px-2 py-1 border-b border-separator items-center'>
      <span className={mx(build.ok ? 'text-success' : 'text-error')}>● {buildLabel}</span>
      {runLabel && <span className='text-error'>● {runLabel}</span>}
    </div>
  );
};

type DiagnosticsListProps = {
  diagnostics: ReadonlyArray<CodeCapabilities.Diagnostic>;
};

const DiagnosticsList = ({ diagnostics }: DiagnosticsListProps) => {
  const { t } = useTranslation(meta.id);
  return (
    <div className='dx-container flex flex-col overflow-auto'>
      <SectionHeader label={t('diagnostics.section.label')} count={diagnostics.length} />
      {diagnostics.length === 0 ? (
        <div className='p-2 text-description'>—</div>
      ) : (
        <ol className='flex flex-col'>
          {diagnostics.map((diagnostic, index) => (
            <li
              key={index}
              className={mx(
                'px-2 py-1 border-b border-separator font-mono',
                diagnostic.severity === 'error' ? 'text-error' : 'text-warning',
              )}
            >
              {diagnostic.path && (
                <span className='text-description'>
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
    </div>
  );
};

type ConsoleViewProps = {
  stdout: ReadonlyArray<string>;
  stderr: ReadonlyArray<string>;
};

const ConsoleView = ({ stdout, stderr }: ConsoleViewProps) => {
  const { t } = useTranslation(meta.id);
  const total = stdout.length + stderr.length;
  return (
    <div className='dx-container flex flex-col overflow-auto'>
      <SectionHeader label={t('console.section.label')} count={total} />
      {total === 0 ? (
        <div className='p-2 text-description'>{t('console.empty.placeholder')}</div>
      ) : (
        <pre className='flex flex-col px-2 py-1 font-mono whitespace-pre-wrap break-all'>
          {stdout.map((line, index) => (
            <span key={`out-${index}`}>{line}</span>
          ))}
          {stderr.map((line, index) => (
            <span key={`err-${index}`} className='text-error'>
              {line}
            </span>
          ))}
        </pre>
      )}
    </div>
  );
};

const SectionHeader = ({ label, count }: { label: string; count: number }) => (
  <div className='px-2 py-1 text-description border-b border-separator flex items-center gap-2 bg-toolbar-surface'>
    <span>{label}</span>
    <span className='text-description'>({count})</span>
  </div>
);
