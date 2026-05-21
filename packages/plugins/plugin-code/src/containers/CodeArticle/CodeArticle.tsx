//
// Copyright 2026 DXOS.org
//

import { javascript } from '@codemirror/lang-javascript';
import { markdown } from '@codemirror/lang-markdown';
import React, { forwardRef, useCallback, useEffect, useMemo, useState } from 'react';

import { useAtomCapabilityState, useOperationInvoker } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Ref } from '@dxos/echo';
import { createDocAccessor } from '@dxos/echo-db';
import { getSpace, useObject } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { Panel, Toolbar, useThemeContext, useTranslation } from '@dxos/react-ui';
import { Editor } from '@dxos/react-ui-editor';
import {
  createBasicExtensions,
  createDataExtensions,
  createThemeExtensions,
  documentSlots,
  editorClassNames,
} from '@dxos/ui-editor';
import { isTruthy } from '@dxos/util';

import { BuildOutput, FileTree } from '#components';
import { meta } from '#meta';
import { CodeCapabilities, CodeOperation, type CodeProject, type SourceFile } from '#types';

export type CodeArticleProps = AppSurface.ObjectArticleProps<CodeProject.CodeProject>;

const languageForPath = (path: string) => {
  if (path.endsWith('.md') || path.endsWith('.mdx')) {
    return markdown();
  }
  return javascript({ typescript: path.endsWith('.ts') || path.endsWith('.tsx') });
};

// Three-pane layout mirroring `react-ui-introspect`'s `ToolsExplorer`:
//
//   ┌───────────┬─────────────────┐
//   │  Browse   │                 │
//   │  (files)  │     Output      │
//   ├───────────┤   (editor)      │
//   │  Inspect  │                 │
//   │  (form)   │                 │
//   └───────────┴─────────────────┘
//
// 30rem fixed left column, 1fr right; left split 1:2 vertically. Same
// `dx-container grid` + `divide-x`/`divide-y separator` idiom as the
// introspect explorer so the visual rhythm matches across panels.
export const CodeArticle = forwardRef<HTMLDivElement, CodeArticleProps>(({ role, subject: project }, forwardedRef) => {
  const { t } = useTranslation(meta.id);
  const invoker = useOperationInvoker();
  const [buildRunState, updateBuildRun] = useAtomCapabilityState(CodeCapabilities.BuildRun);
  const projectId = project.id;
  const projectState = buildRunState[projectId];
  const buildBusy = projectState?.busy === 'build';
  const runBusy = projectState?.busy === 'run';
  const lastBuildOk = projectState?.lastBuild?.ok === true;

  const handleBuild = useCallback(async () => {
    updateBuildRun((current) => ({
      ...current,
      [projectId]: { ...current[projectId], busy: 'build' },
    }));
    const { data } = await invoker.invokePromise(CodeOperation.BuildProject, { project: Ref.make(project) });
    updateBuildRun((current) => ({
      ...current,
      [projectId]: {
        ...current[projectId],
        busy: undefined,
        lastBuild: data
          ? { ok: data.ok, diagnostics: data.diagnostics, entry: data.entry, timestamp: Date.now() }
          : current[projectId]?.lastBuild,
      },
    }));
  }, [invoker, project, projectId, updateBuildRun]);

  const handleRun = useCallback(async () => {
    updateBuildRun((current) => ({
      ...current,
      [projectId]: { ...current[projectId], busy: 'run' },
    }));
    const { data } = await invoker.invokePromise(CodeOperation.RunBuild, { project: Ref.make(project) });
    updateBuildRun((current) => ({
      ...current,
      [projectId]: {
        ...current[projectId],
        busy: undefined,
        lastRun: data
          ? {
              ok: data.ok,
              stdout: data.stdout,
              stderr: data.stderr,
              diagnostics: data.diagnostics,
              timestamp: Date.now(),
            }
          : current[projectId]?.lastRun,
        // A failed build still surfaces diagnostics on the build slot.
        lastBuild:
          data && data.diagnostics.length > 0 && !data.ok
            ? { ok: false, diagnostics: data.diagnostics, entry: undefined, timestamp: Date.now() }
            : current[projectId]?.lastBuild,
      },
    }));
  }, [invoker, project, projectId, updateBuildRun]);

  // Trigger re-render on files mutations.
  useObject(project);
  const fileRefs = useMemo(() => project.files ?? [], [project.files]);

  const [resolvedFiles, setResolvedFiles] = useState<SourceFile.SourceFile[]>([]);
  useEffect(() => {
    let cancelled = false;
    void Promise.all(fileRefs.map((ref) => ref.load())).then((files) => {
      if (!cancelled) {
        const sorted = [...files].sort((a, b) => a.path.localeCompare(b.path));
        setResolvedFiles(sorted);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [fileRefs]);

  const [selectedPath, setSelectedPath] = useState<string | undefined>();
  useEffect(() => {
    if (!selectedPath && resolvedFiles.length > 0) {
      setSelectedPath(resolvedFiles[0].path);
    }
    if (selectedPath && !resolvedFiles.some((file) => file.path === selectedPath)) {
      setSelectedPath(resolvedFiles[0]?.path);
    }
  }, [resolvedFiles, selectedPath]);

  const selected = useMemo(
    () => resolvedFiles.find((file) => file.path === selectedPath),
    [resolvedFiles, selectedPath],
  );

  const fileEntries = useMemo(() => resolvedFiles.map(({ path }) => ({ path })), [resolvedFiles]);

  return (
    <Panel.Root role={role} ref={forwardedRef}>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Toolbar.Button onClick={handleBuild} disabled={buildBusy}>
            {buildBusy ? t('action.build.busy.label') : t('action.build.label')}
          </Toolbar.Button>
          <Toolbar.Button onClick={handleRun} disabled={runBusy || !lastBuildOk}>
            {runBusy ? t('action.run.busy.label') : t('action.run.label')}
          </Toolbar.Button>
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content asChild>
        <div className='dx-container grid grid-cols-[30rem_1fr] divide-x divide-separator' role='none'>
          <div className='dx-container grid grid-rows-[1fr_2fr] divide-y divide-separator'>
            <div role='region' aria-label={t('browse-pane.label')} className='dx-container grid overflow-auto'>
              <FileTree
                files={fileEntries}
                selectedPath={selectedPath}
                onSelect={setSelectedPath}
                emptyMessage={t('view.code.empty.placeholder')}
              />
            </div>
            <div role='region' aria-label={t('inspect-pane.label')} className='dx-container grid overflow-hidden'>
              <BuildOutput state={projectState} />
            </div>
          </div>
          <div role='region' aria-label={t('output-pane.label')} className='dx-container grid min-bs-0 overflow-hidden'>
            {selected ? <FileEditor file={selected} role={role} /> : null}
          </div>
        </div>
      </Panel.Content>
    </Panel.Root>
  );
});

type FileEditorProps = {
  file: SourceFile.SourceFile;
  role?: string;
};

const FileEditor = ({ file, role }: FileEditorProps) => {
  const { themeMode } = useThemeContext();
  const identity = useIdentity();
  const space = getSpace(file);

  // Trigger re-render when content ref resolves.
  useObject(file.content);
  const target = file.content.target;

  const extensions = useMemo(
    () =>
      [
        createBasicExtensions({ lineNumbers: true, lineWrapping: false }),
        createThemeExtensions({ themeMode, slots: documentSlots, monospace: true, syntaxHighlighting: true }),
        languageForPath(file.path),
        target &&
          createDataExtensions({
            id: file.id,
            text: createDocAccessor(target, ['content']),
            messenger: space,
            identity,
          }),
      ].filter(isTruthy),
    [identity, space, file.id, file.path, target, themeMode],
  );

  if (!target) {
    return null;
  }

  return (
    <Editor.Root extensions={extensions}>
      <Editor.View classNames={editorClassNames(role)} />
    </Editor.Root>
  );
};
